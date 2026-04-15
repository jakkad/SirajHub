import { eq } from "drizzle-orm";
import type { Db } from "../db/client";
import { user } from "../db/schema";
import type { Env } from "../types";

export const DEFAULT_AI_MODEL = "gemini-2.5-flash";
export const DEFAULT_AI_QUEUE_INTERVAL_MINUTES = 60;

export type ApiKeysBlob = {
  gemini?: string;
  tmdb?: string;
  youtube?: string;
  googleBooks?: string;
  podcastIndexKey?: string;
  podcastIndexSecret?: string;
  aiModel?: string;
  aiQueueIntervalMinutes?: number;
};

export async function readUserSettings(db: Db, userId: string): Promise<ApiKeysBlob> {
  const [row] = await db.select({ apiKeys: user.apiKeys }).from(user).where(eq(user.id, userId));
  if (!row?.apiKeys) return {};

  try {
    return JSON.parse(row.apiKeys) as ApiKeysBlob;
  } catch {
    return {};
  }
}

export async function writeUserSettings(db: Db, userId: string, settings: ApiKeysBlob) {
  await db
    .update(user)
    .set({ apiKeys: JSON.stringify(settings), updatedAt: new Date() })
    .where(eq(user.id, userId));
}

export async function resolveGeminiKey(db: Db, userId: string, envKey: string): Promise<string> {
  const settings = await readUserSettings(db, userId);
  return settings.gemini || envKey;
}

export async function resolveAiModel(db: Db, userId: string): Promise<string> {
  const settings = await readUserSettings(db, userId);
  return settings.aiModel || DEFAULT_AI_MODEL;
}

export async function resolveAiQueueIntervalMinutes(db: Db, userId: string): Promise<number> {
  const settings = await readUserSettings(db, userId);
  const value = settings.aiQueueIntervalMinutes;
  if (typeof value === "number" && Number.isFinite(value) && value > 0) {
    return Math.max(5, Math.floor(value));
  }
  return DEFAULT_AI_QUEUE_INTERVAL_MINUTES;
}

export async function resolveMetadataEnv(db: Db, userId: string, env: Env): Promise<Env> {
  const keys = await readUserSettings(db, userId);

  return {
    ...env,
    TMDB_API_KEY: keys.tmdb || env.TMDB_API_KEY,
    YOUTUBE_API_KEY: keys.youtube || env.YOUTUBE_API_KEY,
    GOOGLE_BOOKS_API_KEY: keys.googleBooks || env.GOOGLE_BOOKS_API_KEY,
    PODCAST_INDEX_KEY: keys.podcastIndexKey || env.PODCAST_INDEX_KEY,
    PODCAST_INDEX_SECRET: keys.podcastIndexSecret || env.PODCAST_INDEX_SECRET,
  };
}
