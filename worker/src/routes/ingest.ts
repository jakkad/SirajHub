import { Hono } from "hono";
import { eq } from "drizzle-orm";
import { createDb } from "../db/client";
import { urlCache } from "../db/schema";
import { dispatch } from "../services/metadata";
import type { Env } from "../types";

const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

type Variables = { userId: string };

const router = new Hono<{ Bindings: Env; Variables: Variables }>();

router.post("/", async (c) => {
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
    metadata = await dispatch({ url, query, contentType: content_type }, c.env);
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
