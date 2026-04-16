import { eq } from "drizzle-orm";
import type { Db } from "../db/client";
import { user } from "../db/schema";
import type { Env } from "../types";

export const AI_MODELS = [
  {
    id: "gemini-2.5-flash-lite",
    label: "Gemini 2.5 Flash-Lite",
    description: "Best default free-tier choice for fast structured analysis and scoring.",
    family: "gemini",
    supportLevel: "stable",
    capabilities: {
      analyze: "schema",
      score: "schema",
    },
  },
  {
    id: "gemini-3-flash-preview",
    label: "Gemini 3 Flash",
    description: "Preview Gemini option when you want the newer 3-series model.",
    family: "gemini",
    supportLevel: "stable",
    capabilities: {
      analyze: "schema",
      score: "schema",
    },
  },
  {
    id: "gemma-3-27b-it",
    label: "Gemma 3 27B",
    description: "Experimental Gemma instruction model using prompt-guided JSON parsing.",
    family: "gemma",
    supportLevel: "experimental",
    capabilities: {
      analyze: "prompt_json",
      score: "prompt_json",
    },
  },
] as const;

export const AI_MODEL_OPTIONS = AI_MODELS.map((model) => model.id) as readonly string[];
export const DEFAULT_AI_MODEL = "gemini-2.5-flash-lite";
export const DEFAULT_AI_QUEUE_INTERVAL_MINUTES = 60;
export const CONTENT_TYPE_IDS = ["book", "movie", "tv", "podcast", "youtube", "article", "tweet"] as const;
export const DEFAULT_ANALYZE_PROMPT = "Analyze this item for a personal media tracker. Focus on what the content is about, why it may be valuable or worth consuming, and which tags/topics would help organize it. Be concise, practical, and specific.";
export const DEFAULT_SCORE_PROMPT = "Score how strongly this item matches the user's saved interests for this media type. Be consistent, practical, and explain the score clearly. If the metadata is too weak to score confidently, still return a score but explicitly ask for the missing info that would improve it.";

export type ContentTypeId = typeof CONTENT_TYPE_IDS[number];
export type AiModelId = typeof AI_MODELS[number]["id"];
export type AiModelFamily = typeof AI_MODELS[number]["family"];
export type AiModelSupportLevel = typeof AI_MODELS[number]["supportLevel"];
export type AiModelCapabilityMode = typeof AI_MODELS[number]["capabilities"]["analyze"];
export type InterestWeight = "low" | "medium" | "high";
export type InterestChip = {
  id: string;
  label: string;
  weight: InterestWeight;
};
export type InterestProfiles = Partial<Record<ContentTypeId, InterestChip[]>>;
export type AiPrompts = {
  analyze: string;
  score: string;
};

export type AiModelDescriptor = {
  id: AiModelId;
  label: string;
  description: string;
  family: AiModelFamily;
  supportLevel: AiModelSupportLevel;
  capabilities: {
    analyze: AiModelCapabilityMode;
    score: AiModelCapabilityMode;
  };
};

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
  aiPrompts?: Partial<AiPrompts>;
};

const CONTENT_TYPE_ALIASES: Record<string, ContentTypeId> = {
  book: "book",
  books: "book",
  movie: "movie",
  movies: "movie",
  tv: "tv",
  tvshow: "tv",
  tvshows: "tv",
  show: "tv",
  shows: "tv",
  podcast: "podcast",
  podcasts: "podcast",
  youtube: "youtube",
  video: "youtube",
  videos: "youtube",
  article: "article",
  articles: "article",
  tweet: "tweet",
  tweets: "tweet",
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
  return normalizeAiModel(settings.aiModel);
}

export function getAiModelCatalog(): AiModelDescriptor[] {
  return [...AI_MODELS];
}

export function getAiModelMeta(modelId: string | null | undefined): AiModelDescriptor {
  const normalized = normalizeAiModel(modelId);
  return AI_MODELS.find((model) => model.id === normalized) ?? AI_MODELS[0];
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

  const inputRecord = input as Record<string, unknown>;

  for (const [rawKey, rawEntries] of Object.entries(inputRecord)) {
    const contentType = CONTENT_TYPE_ALIASES[rawKey.trim().toLowerCase()];
    if (!contentType || !Array.isArray(rawEntries)) continue;

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

    if (normalized.length === 0) continue;

    const existing = output[contentType] ?? [];
    const seen = new Set(existing.map((entry) => `${entry.label.toLowerCase()}::${entry.weight}`));

    for (const entry of normalized) {
      const key = `${entry.label.toLowerCase()}::${entry.weight}`;
      if (seen.has(key)) continue;
      existing.push(entry);
      seen.add(key);
    }

    if (existing.length > 0) {
      output[contentType] = existing;
    }
  }

  return output;
}

export async function resolveInterestProfiles(db: Db, userId: string): Promise<InterestProfiles> {
  const settings = await readUserSettings(db, userId);
  return normalizeInterestProfiles(settings.interestProfiles);
}

export function normalizeAiModel(input: unknown): AiModelId {
  if (typeof input === "string") {
    const trimmed = input.trim();
    if (AI_MODEL_OPTIONS.includes(trimmed)) {
      return trimmed as AiModelId;
    }
  }
  return DEFAULT_AI_MODEL;
}

export function normalizeAiPrompts(input: unknown): AiPrompts {
  const record = input && typeof input === "object" ? (input as Record<string, unknown>) : {};
  return {
    analyze:
      typeof record.analyze === "string" && record.analyze.trim()
        ? record.analyze.trim()
        : DEFAULT_ANALYZE_PROMPT,
    score:
      typeof record.score === "string" && record.score.trim()
        ? record.score.trim()
        : DEFAULT_SCORE_PROMPT,
  };
}

export async function resolveAiPrompts(db: Db, userId: string): Promise<AiPrompts> {
  const settings = await readUserSettings(db, userId);
  return normalizeAiPrompts(settings.aiPrompts);
}
