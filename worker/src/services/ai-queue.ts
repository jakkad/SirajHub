import { and, desc, eq, inArray, lte } from "drizzle-orm";
import { ulid } from "ulidx";
import { createDb, type Db } from "../db/client";
import { aiCache, aiJobs, items, user } from "../db/schema";
import { DEFAULT_AI_QUEUE_INTERVAL_MINUTES, resolveAiModel, resolveGeminiKey } from "../lib/user-settings";
import { analyzeItem, rankNextList } from "./ai";
import type { Env } from "../types";

export type AiJobType = "analyze_item" | "rank_next";
export type AiJobStatus = "queued" | "processing" | "completed" | "failed";

const NEXT_LIST_KV_TTL_SECONDS = 6 * 60 * 60;
const MAX_RETRY_ATTEMPTS = 3;
const RETRY_DELAY_MINUTES = 60;
const IMMEDIATE_RUN_THRESHOLD = 5;

export function serializeJob(job: typeof aiJobs.$inferSelect) {
  return {
    id: job.id,
    itemId: job.itemId,
    jobType: job.jobType as AiJobType,
    status: job.status as AiJobStatus,
    runAfter: job.runAfter,
    completedAt: job.completedAt,
    lastError: job.lastError,
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

  const [apiKey, model] = await Promise.all([
    resolveGeminiKey(db, job.userId, env.GEMINI_API_KEY),
    resolveAiModel(db, job.userId),
  ]);

  const result = await analyzeItem(apiKey, model, {
    title: item.title,
    contentType: item.contentType,
    creator: item.creator,
    description: item.description,
    releaseDate: item.releaseDate,
    durationMins: item.durationMins,
  });

  await saveAnalysisResult(db, item.id, model, result, item.updatedAt);
  return { model, result };
}

async function processRankNextJob(db: Db, env: Env, job: typeof aiJobs.$inferSelect) {
  const suggestions = await db
    .select()
    .from(items)
    .where(and(eq(items.userId, job.userId), eq(items.status, "suggestions")));

  const [profile] = await db
    .select({ preferences: user.preferences })
    .from(user)
    .where(eq(user.id, job.userId));

  const [apiKey, model] = await Promise.all([
    resolveGeminiKey(db, job.userId, env.GEMINI_API_KEY),
    resolveAiModel(db, job.userId),
  ]);

  const result =
    suggestions.length === 0
      ? []
      : await rankNextList(
          apiKey,
          model,
          suggestions.map((item) => ({
            id: item.id,
            title: item.title,
            contentType: item.contentType,
            creator: item.creator,
            description: item.description,
          })),
          profile?.preferences ?? null
        );

  await env.SIRAJHUB_KV.put(`next_list:v1:${job.userId}`, JSON.stringify(result), {
    expirationTtl: NEXT_LIST_KV_TTL_SECONDS,
  });

  return { model, result };
}

export async function processAiQueue(env: Env) {
  const db = createDb(env.DB);
  const dueJobs = await db
    .select()
    .from(aiJobs)
    .where(and(eq(aiJobs.status, "queued"), lte(aiJobs.runAfter, Date.now())))
    .limit(10);

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
          : await processRankNextJob(db, env, job);

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
  }
}
