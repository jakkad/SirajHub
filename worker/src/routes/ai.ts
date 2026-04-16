import { Hono } from "hono";
import { and, eq, inArray, or } from "drizzle-orm";
import { createDb } from "../db/client";
import { aiCache, aiJobs, items } from "../db/schema";
import { resolveAiQueueIntervalMinutes } from "../lib/user-settings";
import {
  computeFinalSuggestMetric,
  getLatestJob,
  getRecentBoost,
  getRunAfterFromInterval,
  getTrendingBoost,
  listJobs,
  processAiQueue,
  queueAiJob,
  repeatAiJob,
  retryAiJob,
  serializeJob,
  syncSuggestMetrics,
} from "../services/ai-queue";
import type { Env } from "../types";

const CACHE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

type Variables = { userId: string };

const router = new Hono<{ Bindings: Env; Variables: Variables }>();

router.get("/analyze/:id", async (c) => {
  const userId = c.get("userId");
  const id = c.req.param("id");
  const db = createDb(c.env.DB);

  await processAiQueue(c.env);

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

  await processAiQueue(c.env);
  const latestJob = await getLatestJob(db, userId, "analyze_item", id);

  return c.json({
    queued: true,
    result: cached ? JSON.parse(cached.result) : null,
    savedAt: cached?.createdAt ?? null,
    modelUsed: cached?.modelUsed ?? null,
    intervalMinutes,
    job: serializeJob(latestJob ?? job),
  });
});

router.post("/score/:id", async (c) => {
  const userId = c.get("userId");
  const id = c.req.param("id");
  const db = createDb(c.env.DB);

  const [item] = await db
    .select()
    .from(items)
    .where(and(eq(items.id, id), eq(items.userId, userId)));

  if (!item) return c.json({ error: "Not found" }, 404);

  const intervalMinutes = await resolveAiQueueIntervalMinutes(db, userId);
  const job = await queueAiJob(
    db,
    userId,
    "score_item",
    { itemId: id },
    getRunAfterFromInterval(intervalMinutes),
    id
  );

  await processAiQueue(c.env);
  const latestJob = await getLatestJob(db, userId, "score_item", id);

  return c.json({
    queued: true,
    intervalMinutes,
    job: serializeJob(latestJob ?? job),
  });
});

router.get("/next", async (c) => {
  const userId = c.get("userId");
  const db = createDb(c.env.DB);
  const contentType = c.req.query("content_type");

  await processAiQueue(c.env);

  const rankingItems = await db
    .select()
    .from(items)
    .where(
      contentType
        ? and(eq(items.userId, userId), eq(items.status, "suggestions"), eq(items.contentType, contentType))
        : and(eq(items.userId, userId), eq(items.status, "suggestions"))
    );

  const syncedItems = await syncSuggestMetrics(db, rankingItems);
  const relevantItemIds = syncedItems.map((item) => item.id);
  const scoreJobs = relevantItemIds.length > 0
    ? await db
        .select()
        .from(aiJobs)
        .where(
          and(
            eq(aiJobs.userId, userId),
            eq(aiJobs.jobType, "score_item"),
            inArray(aiJobs.itemId, relevantItemIds),
            or(eq(aiJobs.status, "queued"), eq(aiJobs.status, "processing"))
          )
        )
    : [];
  const activeScoreJob = scoreJobs.sort((a, b) => b.createdAt - a.createdAt)[0] ?? null;

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
      explanation: item.suggestMetricReason,
      boosts: {
        recent: getRecentBoost(item.createdAt, item.status),
        trending: getTrendingBoost(item.trendingBoostEnabled),
      },
      pending: item.suggestMetricBase == null,
      updatedAt: item.suggestMetricUpdatedAt,
      needsMoreInfo: item.suggestMetricNeedsMoreInfo,
      moreInfoRequest: item.suggestMetricMoreInfoRequest,
      modelUsed: item.suggestMetricModelUsed,
    }));

  return c.json({
    result,
    savedAt: result[0]?.updatedAt ?? null,
    modelUsed: result[0]?.modelUsed ?? null,
    job: activeScoreJob ? serializeJob(activeScoreJob) : null,
  });
});

router.get("/jobs", async (c) => {
  const userId = c.get("userId");
  const db = createDb(c.env.DB);
  await processAiQueue(c.env);
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

  await processAiQueue(c.env);
  const jobs = await listJobs(db, userId);
  const latest = jobs.find((entry) => entry.id === id) ?? job;

  return c.json({
    ok: true,
    job: serializeJob(latest),
  });
});

router.post("/jobs/:id/repeat", async (c) => {
  const userId = c.get("userId");
  const id = c.req.param("id");
  const db = createDb(c.env.DB);
  const job = await repeatAiJob(db, userId, id);

  if (!job) {
    return c.json({ error: "Completed job not found" }, 404);
  }

  await processAiQueue(c.env);
  const latest = await getLatestJob(db, userId, job.jobType as "analyze_item" | "score_item", job.itemId ?? undefined);

  return c.json({
    ok: true,
    job: serializeJob(latest ?? job),
  });
});

router.delete("/jobs/:id", async (c) => {
  const userId = c.get("userId");
  const id = c.req.param("id");
  const db = createDb(c.env.DB);

  const [job] = await db
    .select()
    .from(aiJobs)
    .where(and(eq(aiJobs.id, id), eq(aiJobs.userId, userId)));

  if (!job) {
    return c.json({ error: "Job not found" }, 404);
  }

  if (job.status !== "queued" && job.status !== "failed") {
    return c.json({ error: "Only queued or failed jobs can be deleted" }, 400);
  }

  await db.delete(aiJobs).where(eq(aiJobs.id, id));

  return c.json({ ok: true });
});

export default router;
