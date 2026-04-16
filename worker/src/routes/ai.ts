import { Hono } from "hono";
import { and, eq, inArray, or } from "drizzle-orm";
import { createDb } from "../db/client";
import { aiCache, aiJobs, items } from "../db/schema";
import { resolveAiModel, resolveAiQueueIntervalMinutes, resolveGeminiKey } from "../lib/user-settings";
import { categorizeItem } from "../services/ai";
import {
  computeFinalSuggestMetric,
  getRecentBoost,
  getTrendingBoost,
  getLatestJob,
  getRunAfterFromInterval,
  listJobs,
  queueAiJob,
  retryAiJob,
  serializeJob,
  syncSuggestMetrics,
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
  const contentType = c.req.query("content_type");
  const rankJob = await getLatestJob(db, userId, "rank_next");
  const scoreJobs = await db
    .select()
    .from(aiJobs)
    .where(
      and(
        eq(aiJobs.userId, userId),
        eq(aiJobs.jobType, "score_item"),
        or(eq(aiJobs.status, "queued"), eq(aiJobs.status, "processing"))
      )
    );
  const activeScoreJob = scoreJobs.sort((a, b) => b.createdAt - a.createdAt)[0] ?? null;
  const job = activeScoreJob ?? rankJob;
  const rankingItems = await db
    .select()
    .from(items)
    .where(
      contentType
        ? and(eq(items.userId, userId), eq(items.status, "suggestions"), eq(items.contentType, contentType))
        : and(eq(items.userId, userId), eq(items.status, "suggestions"))
    );

  const syncedItems = await syncSuggestMetrics(db, rankingItems);
  const result = [...syncedItems]
    .sort((a, b) => {
      const aScore = computeFinalSuggestMetric(a) ?? -1;
      const bScore = computeFinalSuggestMetric(b) ?? -1;
      if (bScore !== aScore) return bScore - aScore;
      if ((b.suggestMetricUpdatedAt ?? 0) !== (a.suggestMetricUpdatedAt ?? 0)) {
        return (b.suggestMetricUpdatedAt ?? 0) - (a.suggestMetricUpdatedAt ?? 0);
      }
      if (b.createdAt !== a.createdAt) return b.createdAt - a.createdAt;
      return a.title.localeCompare(b.title);
    })
    .map((item) => ({
      id: item.id,
      score: item.suggestMetricFinal,
      baseScore: item.suggestMetricBase,
      reason: item.suggestMetricReason,
      boosts: {
        recent: getRecentBoost(item.createdAt, item.status),
        trending: getTrendingBoost(item.trendingBoostEnabled),
      },
      pending: item.suggestMetricBase == null,
      updatedAt: item.suggestMetricUpdatedAt,
    }));

  return c.json({
    result,
    savedAt: result[0]?.updatedAt ?? null,
    modelUsed: null,
    job: job ? serializeJob(job) : null,
  });
});

router.post("/next", async (c) => {
  const userId = c.get("userId");
  const db = createDb(c.env.DB);
  const contentType = c.req.query("content_type") || null;
  const intervalMinutes = await resolveAiQueueIntervalMinutes(db, userId);

  const job = await queueAiJob(
    db,
    userId,
    "rank_next",
    { kind: "next_list_refresh", contentType },
    getRunAfterFromInterval(intervalMinutes)
  );

  return c.json({
    queued: true,
    intervalMinutes,
    result: [],
    savedAt: null,
    modelUsed: null,
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
