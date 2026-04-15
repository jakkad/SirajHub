import { Hono } from "hono";
import { eq } from "drizzle-orm";
import { createDb } from "../db/client";
import { urlCache, user } from "../db/schema";
import { dispatch } from "../services/metadata";
import type { Env } from "../types";

const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

type Variables = { userId: string };

const router = new Hono<{ Bindings: Env; Variables: Variables }>();

type ApiKeysBlob = {
  tmdb?: string;
  youtube?: string;
  googleBooks?: string;
  podcastIndexKey?: string;
  podcastIndexSecret?: string;
};

async function resolveMetadataEnv(
  db: ReturnType<typeof import("../db/client").createDb>,
  userId: string,
  env: Env
): Promise<Env> {
  const [row] = await db.select({ apiKeys: user.apiKeys }).from(user).where(eq(user.id, userId));
  const keys: ApiKeysBlob = row?.apiKeys ? JSON.parse(row.apiKeys) : {};

  return {
    ...env,
    TMDB_API_KEY: keys.tmdb || env.TMDB_API_KEY,
    YOUTUBE_API_KEY: keys.youtube || env.YOUTUBE_API_KEY,
    GOOGLE_BOOKS_API_KEY: keys.googleBooks || env.GOOGLE_BOOKS_API_KEY,
    PODCAST_INDEX_KEY: keys.podcastIndexKey || env.PODCAST_INDEX_KEY,
    PODCAST_INDEX_SECRET: keys.podcastIndexSecret || env.PODCAST_INDEX_SECRET,
  };
}

router.post("/", async (c) => {
  const userId = c.get("userId");
  const body = await c.req.json<{
    url?: string;
    query?: string;
    content_type?: string;
  }>();

  const { url, query, content_type } = body;

  if (!url && !query) {
    return c.json({ error: "url or query is required" }, 400);
  }

  const db = createDb(c.env.DB);
  const resolvedEnv = await resolveMetadataEnv(db, userId, c.env);

  // Return from cache if URL was recently fetched
  if (url) {
    const [cached] = await db
      .select()
      .from(urlCache)
      .where(eq(urlCache.url, url));

    if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
      return c.json(JSON.parse(cached.metadata));
    }
  }

  // Fetch fresh metadata
  let metadata;
  try {
    metadata = await dispatch({ url, query, contentType: content_type }, resolvedEnv);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Fetch failed";
    return c.json({ error: message }, 502);
  }

  // Upsert cache for URL-based requests
  if (url) {
    await db
      .insert(urlCache)
      .values({
        url,
        metadata: JSON.stringify(metadata),
        fetchedAt: Date.now(),
        source: metadata.contentType,
      })
      .onConflictDoUpdate({
        target: urlCache.url,
        set: {
          metadata: JSON.stringify(metadata),
          fetchedAt: Date.now(),
          source: metadata.contentType,
        },
      });
  }

  return c.json(metadata);
});

export default router;
