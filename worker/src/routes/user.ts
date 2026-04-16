import { Hono } from "hono";
import { and, eq, inArray } from "drizzle-orm";
import { createDb } from "../db/client";
import { aiCache, aiJobs, items, user } from "../db/schema";
import {
  DEFAULT_AI_QUEUE_INTERVAL_MINUTES,
  normalizeAiPrompts,
  normalizeInterestProfiles,
  readUserSettings,
  writeUserSettings,
  type ApiKeysBlob,
} from "../lib/user-settings";
import { testGeminiModel } from "../services/ai";
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

  await db.delete(aiJobs).where(eq(aiJobs.userId, userId));

  // Also clear the "next list" KV cache
  await c.env.SIRAJHUB_KV.delete(`next_list:v1:${userId}`);

  return c.json({ ok: true, cleared: userItems.length });
});

const VALID_SERVICES = [
  "gemini", "tmdb", "youtube", "googleBooks",
  "podcastIndexKey", "podcastIndexSecret", "aiModel", "aiQueueIntervalMinutes", "interestProfiles", "aiPrompts",
] as const;

// GET /api/user/settings — returns which keys are set (never returns raw values)
router.get("/settings", async (c) => {
  const userId = c.get("userId");
  const db = createDb(c.env.DB);
  const keys = await readUserSettings(db, userId);

  return c.json({
    gemini:           keys.gemini            ? "set" : null,
    tmdb:             keys.tmdb              ? "set" : null,
    youtube:          keys.youtube           ? "set" : null,
    googleBooks:      keys.googleBooks       ? "set" : null,
    podcastIndexKey:  keys.podcastIndexKey   ? "set" : null,
    podcastIndexSecret: keys.podcastIndexSecret ? "set" : null,
    aiModel:          keys.aiModel           ?? null,
    aiQueueIntervalMinutes:
      typeof keys.aiQueueIntervalMinutes === "number"
        ? keys.aiQueueIntervalMinutes
        : DEFAULT_AI_QUEUE_INTERVAL_MINUTES,
    interestProfiles: normalizeInterestProfiles(keys.interestProfiles),
    aiPrompts: normalizeAiPrompts(keys.aiPrompts),
  });
});

// PATCH /api/user/settings — store or clear a single API key / model selection
router.patch("/settings", async (c) => {
  const userId = c.get("userId");
  const body = await c.req.json<{ service?: string; key?: string; interestProfiles?: unknown; aiPrompts?: unknown }>();

  if (body.interestProfiles !== undefined) {
    const db = createDb(c.env.DB);
    const current = await readUserSettings(db, userId);
    current.interestProfiles = normalizeInterestProfiles(body.interestProfiles);
    await writeUserSettings(db, userId, current);
    return c.json({ ok: true, interestProfiles: current.interestProfiles });
  }

  if (body.aiPrompts !== undefined) {
    const db = createDb(c.env.DB);
    const current = await readUserSettings(db, userId);
    current.aiPrompts = normalizeAiPrompts(body.aiPrompts);
    await writeUserSettings(db, userId, current);
    return c.json({ ok: true, aiPrompts: current.aiPrompts });
  }

  if (!body.service || !VALID_SERVICES.includes(body.service as typeof VALID_SERVICES[number])) {
    return c.json({ error: "Invalid service" }, 400);
  }

  const db = createDb(c.env.DB);
  const current = await readUserSettings(db, userId);

  if (body.service === "aiQueueIntervalMinutes") {
    const parsed = Number.parseInt(body.key ?? "", 10);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      return c.json({ error: "Queue interval must be a positive number of minutes" }, 400);
    }
    current.aiQueueIntervalMinutes = Math.max(5, parsed);
  } else if (body.service === "interestProfiles") {
    current.interestProfiles = normalizeInterestProfiles(body.interestProfiles);
  } else if ((body.key ?? "") === "") {
    delete current[body.service as keyof ApiKeysBlob];
  } else {
    (current as Record<string, string>)[body.service] = body.key ?? "";
  }

  await writeUserSettings(db, userId, current);

  return c.json({
    ok: true,
    interestProfiles:
      body.service === "interestProfiles"
        ? current.interestProfiles ?? {}
        : undefined,
    aiPrompts:
      body.service === "aiPrompts"
        ? normalizeAiPrompts(current.aiPrompts)
        : undefined,
  });
});

// POST /api/user/settings/test — verify an API key without storing it
router.post("/settings/test", async (c) => {
  const userId = c.get("userId");
  const body = await c.req.json<{ service: string; key?: string }>();

  if (body.service !== "gemini") {
    return c.json({ error: "Only Gemini key testing is supported right now" }, 400);
  }

  const db = createDb(c.env.DB);
  const keys = await readUserSettings(db, userId);
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

router.post("/settings/test-model", async (c) => {
  const userId = c.get("userId");
  const body = await c.req.json<{ model?: string; key?: string }>();
  const db = createDb(c.env.DB);
  const keys = await readUserSettings(db, userId);
  const keyToTest = body.key?.trim() || keys.gemini || c.env.GEMINI_API_KEY;
  const model = body.model?.trim() || keys.aiModel || "gemini-2.5-flash";

  if (!keyToTest) {
    return c.json({ ok: false, message: "No Gemini API key found to test", model }, 400);
  }

  try {
    await testGeminiModel(keyToTest, model);
    return c.json({
      ok: true,
      model,
      message: `Model ${model} is available with the current Gemini key`,
    });
  } catch (err) {
    return c.json({
      ok: false,
      model,
      message: err instanceof Error ? err.message : "Model test failed",
    }, 400);
  }
});

export default router;
