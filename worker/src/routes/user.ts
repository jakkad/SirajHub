import { Hono } from "hono";
import { and, eq, inArray } from "drizzle-orm";
import { createDb } from "../db/client";
import { user, items, aiCache } from "../db/schema";
import type { Env } from "../types";

type Variables = { userId: string };

const router = new Hono<{ Bindings: Env; Variables: Variables }>();

// GET /api/user/me — return current user's profile
router.get("/me", async (c) => {
  const userId = c.get("userId");
  const db = createDb(c.env.DB);

  const [profile] = await db
    .select({ id: user.id, name: user.name, email: user.email, preferences: user.preferences })
    .from(user)
    .where(eq(user.id, userId));

  if (!profile) return c.json({ error: "Not found" }, 404);
  return c.json(profile);
});

// PATCH /api/user/me — update name and/or AI taste preferences
router.patch("/me", async (c) => {
  const userId = c.get("userId");
  const body = await c.req.json<{ name?: string; preferences?: string }>();
  const db = createDb(c.env.DB);

  const update: Record<string, unknown> = { updatedAt: new Date() };
  if (typeof body.name === "string" && body.name.trim()) update.name = body.name.trim();
  if (typeof body.preferences === "string") update.preferences = body.preferences;

  await db.update(user).set(update).where(eq(user.id, userId));

  const [updated] = await db
    .select({ id: user.id, name: user.name, email: user.email, preferences: user.preferences })
    .from(user)
    .where(eq(user.id, userId));

  return c.json(updated);
});

// GET /api/user/export — download all items as JSON
router.get("/export", async (c) => {
  const userId = c.get("userId");
  const db = createDb(c.env.DB);

  const allItems = await db
    .select()
    .from(items)
    .where(eq(items.userId, userId));

  return new Response(JSON.stringify({ exported_at: new Date().toISOString(), items: allItems }, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="sirajhub-export-${new Date().toISOString().slice(0, 10)}.json"`,
    },
  });
});

// DELETE /api/user/ai-cache — clear all AI analysis cache for this user's items
router.delete("/ai-cache", async (c) => {
  const userId = c.get("userId");
  const db = createDb(c.env.DB);

  const userItems = await db
    .select({ id: items.id })
    .from(items)
    .where(eq(items.userId, userId));

  if (userItems.length > 0) {
    const itemIds = userItems.map((i) => i.id);
    await db.delete(aiCache).where(inArray(aiCache.contentId, itemIds));
  }

  // Also clear the "next list" KV cache
  await c.env.SIRAJHUB_KV.delete(`next_list:v1:${userId}`);

  return c.json({ ok: true, cleared: userItems.length });
});

// ── API Key settings ──────────────────────────────────────────────────────────

type ApiKeysBlob = {
  gemini?: string;
  tmdb?: string;
  youtube?: string;
  googleBooks?: string;
  podcastIndexKey?: string;
  podcastIndexSecret?: string;
  aiModel?: string;
};

const VALID_SERVICES = [
  "gemini", "tmdb", "youtube", "googleBooks",
  "podcastIndexKey", "podcastIndexSecret", "aiModel",
] as const;

async function readApiKeys(
  db: ReturnType<typeof import("../db/client").createDb>,
  userId: string
): Promise<ApiKeysBlob> {
  const [row] = await db
    .select({ apiKeys: user.apiKeys })
    .from(user)
    .where(eq(user.id, userId));

  return row?.apiKeys ? JSON.parse(row.apiKeys) : {};
}

// GET /api/user/settings — returns which keys are set (never returns raw values)
router.get("/settings", async (c) => {
  const userId = c.get("userId");
  const db = createDb(c.env.DB);
  const keys = await readApiKeys(db, userId);

  return c.json({
    gemini:           keys.gemini            ? "set" : null,
    tmdb:             keys.tmdb              ? "set" : null,
    youtube:          keys.youtube           ? "set" : null,
    googleBooks:      keys.googleBooks       ? "set" : null,
    podcastIndexKey:  keys.podcastIndexKey   ? "set" : null,
    podcastIndexSecret: keys.podcastIndexSecret ? "set" : null,
    aiModel:          keys.aiModel           ?? null,
  });
});

// PATCH /api/user/settings — store or clear a single API key / model selection
router.patch("/settings", async (c) => {
  const userId = c.get("userId");
  const body = await c.req.json<{ service: string; key: string }>();

  if (!body.service || !VALID_SERVICES.includes(body.service as typeof VALID_SERVICES[number])) {
    return c.json({ error: "Invalid service" }, 400);
  }

  const db = createDb(c.env.DB);
  const current = await readApiKeys(db, userId);

  if (body.key === "") {
    delete current[body.service as keyof ApiKeysBlob];
  } else {
    (current as Record<string, string>)[body.service] = body.key;
  }

  await db
    .update(user)
    .set({ apiKeys: JSON.stringify(current), updatedAt: new Date() })
    .where(eq(user.id, userId));

  return c.json({ ok: true });
});

// POST /api/user/settings/test — verify an API key without storing it
router.post("/settings/test", async (c) => {
  const userId = c.get("userId");
  const body = await c.req.json<{ service: string; key?: string }>();

  if (body.service !== "gemini") {
    return c.json({ error: "Only Gemini key testing is supported right now" }, 400);
  }

  const db = createDb(c.env.DB);
  const keys = await readApiKeys(db, userId);
  const keyToTest = body.key?.trim() || keys.gemini || c.env.GEMINI_API_KEY;

  if (!keyToTest) {
    return c.json({ ok: false, message: "No Gemini API key found to test" }, 400);
  }

  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${keyToTest}`);
    if (!res.ok) {
      const text = await res.text();
      return c.json({
        ok: false,
        message: `Gemini ${res.status}: ${text.slice(0, 200)}`,
      }, 400);
    }

    return c.json({
      ok: true,
      message: body.key?.trim()
        ? "Gemini key is valid"
        : keys.gemini
          ? "Saved Gemini key is valid"
          : "Fallback Gemini key from environment is valid",
    });
  } catch (err) {
    return c.json({
      ok: false,
      message: err instanceof Error ? err.message : "Gemini key test failed",
    }, 502);
  }
});

export default router;
