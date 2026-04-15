import { Hono } from "hono";
import { and, eq, inArray } from "drizzle-orm";
import { createDb } from "../db/client";
import { aiCache, items } from "../db/schema";
import { resolveAiModel, resolveAiQueueIntervalMinutes, resolveGeminiKey } from "../lib/user-settings";
import { categorizeItem } from "../services/ai";
import {
  getLatestJob,
  getRunAfterFromInterval,
  listJobs,
  queueAiJob,
  retryAiJob,
  serializeJob,
} from "../services/ai-queue";
import type { Env } from "../types";

const CACHE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

type Variables = { userId: string };

const router = new Hono<{ Bindings: Env; Variables: Variables }>();

router.post("/categorize", async (c) => {
  const userId = c.get("userId");
  const body = await c.req.json<{
    title: string;
    description?: string;
    sourceUrl?: string;
    contentType: string;
  }>();

  if (!body.title) return c.json({ error: "title is required" }, 400);

  const db = createDb(c.env.DB);
  const [apiKey, model] = await Promise.all([
    resolveGeminiKey(db, userId, c.env.GEMINI_API_KEY),
    resolveAiModel(db, userId),
  ]);

  try {
    const result = await categorizeItem(apiKey, model, {
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

router.get("/analyze/:id", async (c) => {
  const userId = c.get("userId");
  const id = c.req.param("id");
  const db = createDb(c.env.DB);

  const [item] = await db
    .select()
    .from(items)
    .where(and(eq(items.id, id), eq(items.userId, userId)));

  if (!item) return c.json({ error: "Not found" }, 404);

  const [cached] = await db
    .select()
    .from(aiCache)
    .where(and(eq(aiCache.contentId, id), eq(aiCache.analysisType, "summary")));

  const isFresh =
    cached &&
    Date.now() - cached.createdAt < CACHE_MAX_AGE_MS &&
    item.updatedAt <= cached.createdAt;

  const latestJob = await getLatestJob(db, userId, "analyze_item", id);

  return c.json({
    cached: Boolean(isFresh),
    result: cached ? JSON.parse(cached.result) : null,
    savedAt: cached?.createdAt ?? null,
    modelUsed: cached?.modelUsed ?? null,
    job: latestJob ? serializeJob(latestJob) : null,
  });
});

router.post("/analyze/:id", async (c) => {
  const userId = c.get("userId");
  const id = c.req.param("id");
  const db = createDb(c.env.DB);

  const [item] = await db
    .select()
    .from(items)
    .where(and(eq(items.id, id), eq(items.userId, userId)));

  if (!item) return c.json({ error: "Not found" }, 404);

  const [cached] = await db
    .select()
    .from(aiCache)
    .where(and(eq(aiCache.contentId, id), eq(aiCache.analysisType, "summary")));

  const intervalMinutes = await resolveAiQueueIntervalMinutes(db, userId);
  const job = await queueAiJob(
    db,
    userId,
    "analyze_item",
    { itemId: id },
    getRunAfterFromInterval(intervalMinutes),
    id
  );

  return c.json({
    queued: true,
    result: cached ? JSON.parse(cached.result) : null,
    savedAt: cached?.createdAt ?? null,
    modelUsed: cached?.modelUsed ?? null,
    intervalMinutes,
    job: serializeJob(job),
  });
});

router.get("/next", async (c) => {
  const userId = c.get("userId");
  const db = createDb(c.env.DB);
  const job = await getLatestJob(db, userId, "rank_next");

  return c.json({
    result: job?.status === "completed" && job.result ? JSON.parse(job.result) : [],
    savedAt: job?.completedAt ?? null,
    modelUsed: job?.modelUsed ?? null,
    job: job ? serializeJob(job) : null,
  });
});

router.post("/next", async (c) => {
  const userId = c.get("userId");
  const db = createDb(c.env.DB);
  const intervalMinutes = await resolveAiQueueIntervalMinutes(db, userId);

  const job = await queueAiJob(
    db,
    userId,
    "rank_next",
    { kind: "next_list" },
    getRunAfterFromInterval(intervalMinutes)
  );

  const latest = await getLatestJob(db, userId, "rank_next");

  return c.json({
    queued: true,
    intervalMinutes,
    result: latest?.status === "completed" && latest.result ? JSON.parse(latest.result) : [],
    savedAt: latest?.completedAt ?? null,
    modelUsed: latest?.modelUsed ?? null,
    job: serializeJob(job),
  });
});

router.get("/jobs", async (c) => {
  const userId = c.get("userId");
  const db = createDb(c.env.DB);
  const jobs = await listJobs(db, userId);
  const itemIds = jobs.map((job) => job.itemId).filter((value): value is string => Boolean(value));

  const relatedItems =
    itemIds.length > 0
      ? await db
          .select({ id: items.id, title: items.title })
          .from(items)
          .where(inArray(items.id, itemIds))
      : [];

  const titleById = Object.fromEntries(relatedItems.map((item) => [item.id, item.title]));

  return c.json({
    jobs: jobs.map((job) => ({
      ...serializeJob(job),
      itemTitle: job.itemId ? titleById[job.itemId] ?? null : null,
    })),
  });
});

router.post("/jobs/:id/retry", async (c) => {
  const userId = c.get("userId");
  const id = c.req.param("id");
  const db = createDb(c.env.DB);
  const job = await retryAiJob(db, userId, id);

  if (!job) {
    return c.json({ error: "Job not found" }, 404);
  }

  return c.json({
    ok: true,
    job: serializeJob(job),
  });
});

export default router;
