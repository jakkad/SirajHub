import { Hono } from "hono";
import { eq } from "drizzle-orm";
import { createDb } from "../db/client";
import { urlCache } from "../db/schema";
import { resolveMetadataEnv } from "../lib/user-settings";
import { dispatch, resolveSuggestion, searchByQuery } from "../services/metadata";
import type { Env } from "../types";

const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

type Variables = { userId: string };

const router = new Hono<{ Bindings: Env; Variables: Variables }>();

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

router.post("/search", async (c) => {
  const userId = c.get("userId");
  const body = await c.req.json<{
    query?: string;
    content_type?: string;
  }>();

  if (!body.query?.trim() || !body.content_type) {
    return c.json({ error: "query and content_type are required" }, 400);
  }

  const db = createDb(c.env.DB);
  const resolvedEnv = await resolveMetadataEnv(db, userId, c.env);

  try {
    const suggestions = await searchByQuery(body.query.trim(), body.content_type, resolvedEnv);
    return c.json({ suggestions: suggestions.slice(0, 5) });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Search failed";
    return c.json({ error: message }, 502);
  }
});

router.post("/resolve", async (c) => {
  const userId = c.get("userId");
  const body = await c.req.json<{
    suggestion?: Parameters<typeof resolveSuggestion>[0];
  }>();

  if (!body.suggestion) {
    return c.json({ error: "suggestion is required" }, 400);
  }

  const db = createDb(c.env.DB);
  const resolvedEnv = await resolveMetadataEnv(db, userId, c.env);

  try {
    const metadata = await resolveSuggestion(body.suggestion, resolvedEnv);
    return c.json(metadata);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Resolve failed";
    return c.json({ error: message }, 502);
  }
});

export default router;
