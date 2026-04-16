import { eq } from "drizzle-orm";
import type { Db } from "../db/client";
import { user } from "../db/schema";
import type { Env } from "../types";

export const DEFAULT_AI_MODEL = "gemini-2.5-flash";
export const DEFAULT_AI_QUEUE_INTERVAL_MINUTES = 60;
export const CONTENT_TYPE_IDS = ["book", "movie", "tv", "podcast", "youtube", "article", "tweet"] as const;

export type ContentTypeId = typeof CONTENT_TYPE_IDS[number];
export type InterestWeight = "low" | "medium" | "high";
export type InterestChip = {
  id: string;
  label: string;
  weight: InterestWeight;
};
export type InterestProfiles = Partial<Record<ContentTypeId, InterestChip[]>>;

export type ApiKeysBlob = {
  gemini?: string;
  tmdb?: string;
  youtube?: string;
  googleBooks?: string;
  podcastIndexKey?: string;
  podcastIndexSecret?: string;
  aiModel?: string;
  aiQueueIntervalMinutes?: number;
  interestProfiles?: InterestProfiles;
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

export function normalizeInterestProfiles(input: unknown): InterestProfiles {
  if (!input || typeof input !== "object") return {};

  const output: InterestProfiles = {};

  for (const contentType of CONTENT_TYPE_IDS) {
    const rawEntries = (input as Record<string, unknown>)[contentType];
    if (!Array.isArray(rawEntries)) continue;

    const normalized = rawEntries
      .map((entry) => {
        if (!entry || typeof entry !== "object") return null;
        const record = entry as Record<string, unknown>;
        const id = typeof record.id === "string" ? record.id.trim() : "";
        const label = typeof record.label === "string" ? record.label.trim() : "";
        const weight = record.weight;

        if (!label) return null;
        if (weight !== "low" && weight !== "medium" && weight !== "high") return null;

        return {
          id: id || `${contentType}:${label.toLowerCase().replace(/\s+/g, "-")}`,
          label,
          weight,
        } satisfies InterestChip;
      })
      .filter((entry): entry is InterestChip => Boolean(entry));

    if (normalized.length > 0) {
      output[contentType] = normalized;
    }
  }

  return output;
}

export async function resolveInterestProfiles(db: Db, userId: string): Promise<InterestProfiles> {
  const settings = await readUserSettings(db, userId);
  return normalizeInterestProfiles(settings.interestProfiles);
}
