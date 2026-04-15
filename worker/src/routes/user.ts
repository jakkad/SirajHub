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

// GET /api/user/settings — returns which keys are set (never returns raw values)
router.get("/settings", async (c) => {
  const userId = c.get("userId");
  const db = createDb(c.env.DB);

  const [row] = await db
    .select({ apiKeys: user.apiKeys })
    .from(user)
    .where(eq(user.id, userId));

  const keys: ApiKeysBlob = row?.apiKeys ? JSON.parse(row.apiKeys) : {};

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

  const [row] = await db
    .select({ apiKeys: user.apiKeys })
    .from(user)
    .where(eq(user.id, userId));

  const current: ApiKeysBlob = row?.apiKeys ? JSON.parse(row.apiKeys) : {};

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

export default router;
