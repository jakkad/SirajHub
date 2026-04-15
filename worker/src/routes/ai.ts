import { Hono } from "hono";
import { and, eq } from "drizzle-orm";
import { createDb } from "../db/client";
import { items, aiCache, user } from "../db/schema";
import { analyzeItem, categorizeItem, rankNextList } from "../services/ai";
import { ulid } from "ulidx";
import type { Env } from "../types";

const CACHE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const NEXT_LIST_TTL_S = 6 * 60 * 60; // 6 hours in KV

const nextListKey = (userId: string) => `next_list:v1:${userId}`;

type Variables = { userId: string };

const router = new Hono<{ Bindings: Env; Variables: Variables }>();

// ── POST /api/ai/categorize ───────────────────────────────────────────────────
// Lightweight categorization call: given title + description + url, returns
// content_type, confidence, suggested_tags, suggested_status. No caching —
// used in the add-item dialog and item detail panel (fast, one-shot).
router.post("/categorize", async (c) => {
  const body = await c.req.json<{
    title: string;
    description?: string;
    sourceUrl?: string;
    contentType: string;
  }>();

  if (!body.title) return c.json({ error: "title is required" }, 400);

  try {
    const result = await categorizeItem(c.env.GEMINI_API_KEY, {
      title: body.title,
      description: body.description,
      sourceUrl: body.sourceUrl,
      contentType: body.contentType,
    });
    return c.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "AI request failed";
    return c.json({ error: message }, 502);
  }
});

// ── POST /api/ai/analyze/:id ──────────────────────────────────────────────────
// Returns an AI summary for a single item. Checks ai_cache first; calls Gemini
// if cache is missing or stale (item updated after cache was written).
router.post("/analyze/:id", async (c) => {
  const userId = c.get("userId");
  const id = c.req.param("id");
  const db = createDb(c.env.DB);

  const [item] = await db
    .select()
    .from(items)
    .where(and(eq(items.id, id), eq(items.userId, userId)));

  if (!item) return c.json({ error: "Not found" }, 404);

  // Check cache: stale if > 7 days old OR item was updated after cache was written
  const [cached] = await db
    .select()
    .from(aiCache)
    .where(and(eq(aiCache.contentId, id), eq(aiCache.analysisType, "summary")));

  const isFresh =
    cached &&
    Date.now() - cached.createdAt < CACHE_MAX_AGE_MS &&
    item.updatedAt <= cached.createdAt;

  if (isFresh) {
    return c.json({ cached: true, result: JSON.parse(cached.result) });
  }

  // Call Gemini
  let result;
  try {
    result = await analyzeItem(c.env.GEMINI_API_KEY, {
      title: item.title,
      contentType: item.contentType,
      creator: item.creator,
      description: item.description,
      releaseDate: item.releaseDate,
      durationMins: item.durationMins,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "AI request failed";
    return c.json({ error: message }, 502);
  }

  const now = Date.now();
  const resultStr = JSON.stringify(result);

  if (cached) {
    await db
      .update(aiCache)
      .set({ result: resultStr, createdAt: now })
      .where(eq(aiCache.id, cached.id));
  } else {
    await db.insert(aiCache).values({
      id: ulid(),
      contentId: id,
      analysisType: "summary",
      modelUsed: "gemini-2.0-flash-lite",
      promptHash: item.updatedAt.toString(),
      result: resultStr,
      createdAt: now,
    });
  }

  return c.json({ cached: false, result });
});

// ── GET /api/ai/next ──────────────────────────────────────────────────────────
// Returns all "suggestions" items ranked by Gemini for what to consume next.
// Result cached in KV for 6 hours. Pass ?refresh=1 to force re-ranking.
router.get("/next", async (c) => {
  const userId = c.get("userId");
  const refresh = c.req.query("refresh") === "1";
  const kvKey = nextListKey(userId);

  if (!refresh) {
    const cached = await c.env.SIRAJHUB_KV.get(kvKey, "json");
    if (cached) return c.json({ cached: true, result: cached });
  }

  const db = createDb(c.env.DB);

  const suggestions = await db
    .select()
    .from(items)
    .where(and(eq(items.userId, userId), eq(items.status, "suggestions")));

  if (suggestions.length === 0) {
    return c.json({ cached: false, result: [] });
  }

  const [userData] = await db
    .select({ preferences: user.preferences })
    .from(user)
    .where(eq(user.id, userId));

  let ranked;
  try {
    ranked = await rankNextList(
      c.env.GEMINI_API_KEY,
      suggestions.map((s) => ({
        id: s.id,
        title: s.title,
        contentType: s.contentType,
        creator: s.creator,
        description: s.description,
      })),
      userData?.preferences ?? null
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "AI request failed";
    return c.json({ error: message }, 502);
  }

  await c.env.SIRAJHUB_KV.put(kvKey, JSON.stringify(ranked), {
    expirationTtl: NEXT_LIST_TTL_S,
  });

  return c.json({ cached: false, result: ranked });
});

export default router;
