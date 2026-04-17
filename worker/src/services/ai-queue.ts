import { and, desc, eq, inArray, lte } from "drizzle-orm";
import { ulid } from "ulidx";
import { createDb, type Db } from "../db/client";
import { aiCache, aiJobs, itemTags, items, tags } from "../db/schema";
import {
  CONTENT_TYPE_IDS,
  DEFAULT_AI_QUEUE_INTERVAL_MINUTES,
  getAiModelMeta,
  resolveAiModel,
  resolveAiPrompts,
  resolveGeminiKey,
  resolveInterestProfiles,
  resolveMetadataEnv,
  resolveAiQueueIntervalMinutes,
} from "../lib/user-settings";
import { analyzeItem, scoreSuggestMetric } from "./ai";
import { dispatch } from "./metadata";
import type { Env } from "../types";

export type AiJobType = "analyze_item" | "score_item" | "fetch_metadata";
export type AiJobStatus = "queued" | "processing" | "completed" | "failed";
const MAX_RETRY_ATTEMPTS = 3;
const RETRY_DELAY_MINUTES = 60;
const IMMEDIATE_RUN_THRESHOLD = 5;

export function serializeJob(job: typeof aiJobs.$inferSelect) {
  const modelMeta = getAiModelMeta(job.modelUsed);
  let result: unknown = null;
  try {
    result = job.result ? JSON.parse(job.result) : null;
  } catch {
    result = job.result ?? null;
  }

  return {
    id: job.id,
    itemId: job.itemId,
    jobType: job.jobType as AiJobType,
    status: job.status as AiJobStatus,
    runAfter: job.runAfter,
    completedAt: job.completedAt,
    lastError: job.lastError,
    result,
    modelUsed: job.modelUsed,
    modelFamily: job.modelUsed ? modelMeta.family : null,
    supportLevel: job.modelUsed ? modelMeta.supportLevel : null,
    attempts: job.attempts,
    createdAt: job.createdAt,
    updatedAt: job.updatedAt,
  };
}

export async function getLatestJob(db: Db, userId: string, jobType: AiJobType, itemId?: string) {
  const jobs = await db
    .select()
    .from(aiJobs)
    .where(
      itemId
        ? and(eq(aiJobs.userId, userId), eq(aiJobs.jobType, jobType), eq(aiJobs.itemId, itemId))
        : and(eq(aiJobs.userId, userId), eq(aiJobs.jobType, jobType))
    );

  return jobs.sort((a, b) => b.createdAt - a.createdAt)[0] ?? null;
}

export async function listJobs(db: Db, userId: string) {
  return db
    .select()
    .from(aiJobs)
    .where(eq(aiJobs.userId, userId))
    .orderBy(desc(aiJobs.createdAt))
    .limit(50);
}

export function getRunAfterFromInterval(intervalMinutes = DEFAULT_AI_QUEUE_INTERVAL_MINUTES) {
  return Date.now() + Math.max(5, intervalMinutes) * 60 * 1000;
}

async function resolveQueuedRunAfter(db: Db, requestedRunAfter: number) {
  const activeJobs = await db
    .select({ id: aiJobs.id })
    .from(aiJobs)
    .where(inArray(aiJobs.status, ["queued", "processing"]));

  return activeJobs.length < IMMEDIATE_RUN_THRESHOLD ? Date.now() : requestedRunAfter;
}

export async function queueAiJob(
  db: Db,
  userId: string,
  jobType: AiJobType,
  payload: Record<string, unknown>,
  runAfter: number,
  itemId?: string
) {
  const existing = await getLatestJob(db, userId, jobType, itemId);
  const now = Date.now();
  const resolvedRunAfter = await resolveQueuedRunAfter(db, runAfter);

  if (existing && (existing.status === "queued" || existing.status === "processing")) {
    await db
      .update(aiJobs)
      .set({
        payload: JSON.stringify(payload),
        runAfter: resolvedRunAfter,
        updatedAt: now,
        lastError: null,
      })
      .where(eq(aiJobs.id, existing.id));
    return (await getLatestJob(db, userId, jobType, itemId))!;
  }

  const job = {
    id: ulid(),
    userId,
    itemId: itemId ?? null,
    jobType,
    status: "queued" as const,
    payload: JSON.stringify(payload),
    result: null,
    modelUsed: null,
    attempts: 0,
    maxAttempts: MAX_RETRY_ATTEMPTS,
    lastError: null,
    runAfter: resolvedRunAfter,
    completedAt: null,
    createdAt: now,
    updatedAt: now,
  };

  await db.insert(aiJobs).values(job);
  return job;
}

export function getRecentBoost(createdAt: number, status: string, now = Date.now()) {
  return status === "suggestions" && now - createdAt < 7 * 24 * 60 * 60 * 1000 ? 50 : 0;
}

export function getTrendingBoost(enabled: boolean) {
  return enabled ? 100 : 0;
}

export function getManualBoost(value: number | null | undefined) {
  return Math.max(0, value ?? 0);
}

export function isRecommendationEligible(
  item: {
    status: string;
    hiddenFromRecommendations?: boolean;
    cooldownUntil?: number | null;
  },
  now = Date.now()
) {
  if (item.status !== "suggestions") return false;
  if (item.hiddenFromRecommendations) return false;
  if ((item.cooldownUntil ?? 0) > now) return false;
  return true;
}

export function computeFinalSuggestMetric(item: {
  suggestMetricBase: number | null;
  trendingBoostEnabled: boolean;
  manualBoost?: number | null;
  createdAt: number;
  status: string;
}, now = Date.now()) {
  if (item.suggestMetricBase == null) return null;

  return item.suggestMetricBase
    + getRecentBoost(item.createdAt, item.status, now)
    + getTrendingBoost(item.trendingBoostEnabled)
    + getManualBoost(item.manualBoost);
}

export async function syncSuggestMetric(db: Db, item: typeof items.$inferSelect, now = Date.now()) {
  const finalScore = computeFinalSuggestMetric(item, now);

  if (
    item.suggestMetricFinal === finalScore &&
    (finalScore == null || item.suggestMetricUpdatedAt != null)
  ) {
    return item;
  }

  await db
    .update(items)
    .set({
      suggestMetricFinal: finalScore,
      suggestMetricUpdatedAt: item.suggestMetricUpdatedAt ?? now,
    })
    .where(eq(items.id, item.id));

  const [updated] = await db.select().from(items).where(eq(items.id, item.id));
  return updated ?? item;
}

export async function syncSuggestMetrics(db: Db, itemList: Array<typeof items.$inferSelect>, now = Date.now()) {
  return Promise.all(itemList.map((item) => syncSuggestMetric(db, item, now)));
}

export async function retryAiJob(db: Db, userId: string, jobId: string) {
  const [job] = await db
    .select()
    .from(aiJobs)
    .where(and(eq(aiJobs.id, jobId), eq(aiJobs.userId, userId)));

  if (!job) return null;

  const nextRunAt = Date.now();
  await db
    .update(aiJobs)
    .set({
      status: "queued",
      runAfter: nextRunAt,
      lastError: null,
      updatedAt: nextRunAt,
      completedAt: null,
    })
    .where(eq(aiJobs.id, job.id));

  const [updated] = await db
    .select()
    .from(aiJobs)
    .where(eq(aiJobs.id, job.id));

  return updated ?? null;
}

export async function repeatAiJob(db: Db, userId: string, jobId: string) {
  const [job] = await db
    .select()
    .from(aiJobs)
    .where(and(eq(aiJobs.id, jobId), eq(aiJobs.userId, userId)));

  if (!job || job.status !== "completed") return null;

  const repeated = await queueAiJob(
    db,
    userId,
    job.jobType as AiJobType,
    JSON.parse(job.payload) as Record<string, unknown>,
    Date.now(),
    job.itemId ?? undefined
  );

  return repeated;
}

async function saveAnalysisResult(db: Db, itemId: string, model: string, result: unknown, updatedAtHint: number) {
  const [cached] = await db
    .select()
    .from(aiCache)
    .where(and(eq(aiCache.contentId, itemId), eq(aiCache.analysisType, "summary")));

  const now = Date.now();
  const resultStr = JSON.stringify(result);

  if (cached) {
    await db
      .update(aiCache)
      .set({
        result: resultStr,
        modelUsed: model,
        promptHash: updatedAtHint.toString(),
        createdAt: now,
      })
      .where(eq(aiCache.id, cached.id));
    return;
  }

  await db.insert(aiCache).values({
    id: ulid(),
    contentId: itemId,
    analysisType: "summary",
    modelUsed: model,
    promptHash: updatedAtHint.toString(),
    result: resultStr,
    createdAt: now,
  });
}

async function processAnalyzeJob(db: Db, env: Env, job: typeof aiJobs.$inferSelect) {
  const payload = JSON.parse(job.payload) as { itemId?: string };
  const itemId = payload.itemId ?? job.itemId ?? undefined;
  if (!itemId) throw new Error("Missing item id");

  const [item] = await db
    .select()
    .from(items)
    .where(and(eq(items.id, itemId), eq(items.userId, job.userId)));

  if (!item) throw new Error("Item not found");

  const currentTags = await db
    .select({ name: tags.name })
    .from(itemTags)
    .innerJoin(tags, eq(itemTags.tagId, tags.id))
    .where(eq(itemTags.itemId, item.id));

  const [apiKey, model, prompts] = await Promise.all([
    resolveGeminiKey(db, job.userId, env.GEMINI_API_KEY),
    resolveAiModel(db, job.userId),
    resolveAiPrompts(db, job.userId),
  ]);

  const result = await analyzeItem(apiKey, model, prompts.analyze, {
    title: item.title,
    contentType: item.contentType,
    creator: item.creator,
    description: item.description,
    releaseDate: item.releaseDate,
    durationMins: item.durationMins,
    sourceUrl: item.sourceUrl,
    metadata: item.metadata,
    tags: currentTags.map((entry) => entry.name),
  });

  await saveAnalysisResult(db, item.id, model, result, item.updatedAt);
  return { model, result };
}

async function processScoreJob(db: Db, env: Env, job: typeof aiJobs.$inferSelect) {
  const payload = JSON.parse(job.payload) as { itemId?: string };
  const itemId = payload.itemId ?? job.itemId ?? undefined;
  if (!itemId) throw new Error("Missing item id");

  const [item] = await db
    .select()
    .from(items)
    .where(and(eq(items.id, itemId), eq(items.userId, job.userId)));

  if (!item) throw new Error("Item not found");

  const [cachedAnalysis] = await db
    .select()
    .from(aiCache)
    .where(and(eq(aiCache.contentId, item.id), eq(aiCache.analysisType, "summary")));

  const parsedAnalysis = cachedAnalysis
    ? (() => {
        try {
          const result = JSON.parse(cachedAnalysis.result) as Record<string, unknown>;
          return {
            summary: typeof result.summary === "string" ? result.summary : null,
            contentAnalysis: typeof result.contentAnalysis === "string" ? result.contentAnalysis : null,
            tagSuggestions: Array.isArray(result.tagSuggestions)
              ? result.tagSuggestions.filter((entry): entry is string => typeof entry === "string")
              : [],
            topicSuggestions: Array.isArray(result.topicSuggestions)
              ? result.topicSuggestions.filter((entry): entry is string => typeof entry === "string")
              : [],
          };
        } catch {
          return null;
        }
      })()
    : null;

  const [apiKey, model, interestProfiles, prompts] = await Promise.all([
    resolveGeminiKey(db, job.userId, env.GEMINI_API_KEY),
    resolveAiModel(db, job.userId),
    resolveInterestProfiles(db, job.userId),
    resolveAiPrompts(db, job.userId),
  ]);

  const interests = CONTENT_TYPE_IDS.includes(item.contentType as (typeof CONTENT_TYPE_IDS)[number])
    ? interestProfiles[item.contentType as (typeof CONTENT_TYPE_IDS)[number]] ?? []
    : [];
  const interestLines = interests.map((entry) => `${entry.label} (${entry.weight})`);

  const result = await scoreSuggestMetric(
    apiKey,
    model,
    prompts.score,
    {
      title: item.title,
      contentType: item.contentType,
      creator: item.creator,
      description: item.description,
      sourceUrl: item.sourceUrl,
      releaseDate: item.releaseDate,
      metadata: item.metadata,
      analysisSummary: parsedAnalysis?.summary,
      analysisContent: parsedAnalysis?.contentAnalysis,
      analysisTags: parsedAnalysis?.tagSuggestions,
      analysisTopics: parsedAnalysis?.topicSuggestions,
    },
    interestLines
  );

  const updatedAt = Date.now();
  const finalScore = computeFinalSuggestMetric(
    {
      suggestMetricBase: result.score,
      trendingBoostEnabled: item.trendingBoostEnabled,
      createdAt: item.createdAt,
      status: item.status,
    },
    updatedAt
  );

  await db
    .update(items)
    .set({
      suggestMetricBase: result.score,
      suggestMetricFinal: finalScore,
      suggestMetricUpdatedAt: updatedAt,
      suggestMetricReason: result.explanation,
      suggestMetricNeedsMoreInfo: result.needsMoreInfo,
      suggestMetricMoreInfoRequest: result.moreInfoRequest,
      suggestMetricModelUsed: model,
    })
    .where(eq(items.id, item.id));

  return { model, result: { ...result, finalScore, interestLinesUsed: interestLines } };
}

async function processFetchMetadataJob(db: Db, env: Env, job: typeof aiJobs.$inferSelect) {
  const payload = JSON.parse(job.payload) as { itemId?: string };
  const itemId = payload.itemId ?? job.itemId ?? undefined;
  if (!itemId) throw new Error("Missing item id");

  const [item] = await db
    .select()
    .from(items)
    .where(and(eq(items.id, itemId), eq(items.userId, job.userId)));

  if (!item) throw new Error("Item not found");

  const resolvedEnv = await resolveMetadataEnv(db, job.userId, env);
  const metadata = await dispatch({ query: item.title, contentType: item.contentType }, resolvedEnv);

  const now = Date.now();
  await db
    .update(items)
    .set({
      coverUrl: item.coverUrl || metadata.coverUrl || null,
      description: item.description || metadata.description || null,
      creator: item.creator || metadata.creator || null,
      releaseDate: item.releaseDate || metadata.releaseDate || null,
      durationMins: item.durationMins || metadata.durationMins || null,
      sourceUrl: item.sourceUrl || metadata.sourceUrl || null,
      externalId: item.externalId || metadata.externalId || null,
      metadata: item.metadata || metadata.metadata || null,
      updatedAt: now,
    })
    .where(eq(items.id, item.id));

  const intervalMinutes = await resolveAiQueueIntervalMinutes(db, job.userId);
  await queueAiJob(db, job.userId, "score_item", { itemId }, getRunAfterFromInterval(intervalMinutes), itemId);

  return { model: null, result: { success: true, metadata } };
}

export async function processAiQueue(env: Env) {
  const db = createDb(env.DB);
  let processed = 0;

  while (processed < 25) {
    const dueJobs = await db
      .select()
      .from(aiJobs)
      .where(and(eq(aiJobs.status, "queued"), lte(aiJobs.runAfter, Date.now())))
      .limit(10);

    if (dueJobs.length === 0) break;

    for (const job of dueJobs) {
      const attempt = job.attempts + 1;
      await db
        .update(aiJobs)
        .set({
          status: "processing",
          attempts: attempt,
          updatedAt: Date.now(),
          lastError: null,
        })
        .where(eq(aiJobs.id, job.id));

      try {
        const output =
          job.jobType === "analyze_item"
            ? await processAnalyzeJob(db, env, job)
            : job.jobType === "fetch_metadata"
            ? await processFetchMetadataJob(db, env, job)
            : await processScoreJob(db, env, job);

        await db
          .update(aiJobs)
          .set({
            status: "completed",
            result: JSON.stringify(output.result),
            modelUsed: output.model,
            completedAt: Date.now(),
            updatedAt: Date.now(),
            lastError: null,
          })
          .where(eq(aiJobs.id, job.id));
      } catch (error) {
        const message = error instanceof Error ? error.message : "AI job failed";
        const exhausted = attempt >= job.maxAttempts;

        await db
          .update(aiJobs)
          .set({
            status: exhausted ? "failed" : "queued",
            lastError: message,
            runAfter: exhausted ? job.runAfter : Date.now() + RETRY_DELAY_MINUTES * 60 * 1000,
            updatedAt: Date.now(),
          })
          .where(eq(aiJobs.id, job.id));
      }

      processed += 1;
      if (processed >= 25) break;
    }
  }
}
