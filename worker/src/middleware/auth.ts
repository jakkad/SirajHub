import { createMiddleware } from "hono/factory";
import { createAuth } from "../auth";
import type { Env } from "../types";

import { eq } from "drizzle-orm";
import { createDb } from "../db/client";
import { obsidianSyncKeys } from "../db/schema";
import { canUseSyncKey, digestSyncKey, isSyncKey, validSyncWrite } from "../lib/sync-keys";

type Variables = { userId: string; syncKey?: boolean };

/**
 * Validates the session cookie / bearer token via Better Auth.
 * Injects userId into Hono context; returns 401 if no valid session.
 * Apply to all /api/* routes (not /auth/*).
 */
export const requireAuth = createMiddleware<{
  Bindings: Env;
  Variables: Variables;
}>(async (c, next) => {
  const token = c.req.header("Authorization")?.match(/^Bearer\s+(srj_sync_.*)$/i)?.[1];
  if (token) {
    if (!isSyncKey(token)) return c.json({ error: "Invalid sync key" }, 401);
    if (!canUseSyncKey(c.req.method, c.req.path)) {
      return c.json({ error: "This endpoint is outside the sync key scope" }, 403);
    }
    const db = createDb(c.env.DB);
    const [key] = await db.select({ userId: obsidianSyncKeys.userId }).from(obsidianSyncKeys)
      .where(eq(obsidianSyncKeys.digest, await digestSyncKey(token)));
    if (!key) return c.json({ error: "Invalid or revoked sync key" }, 401);
    if (c.req.method !== "GET") {
      const body = await c.req.json<unknown>().catch(() => null);
      if (!validSyncWrite(body, c.req.method === "POST")) {
        return c.json({ error: "Invalid sync item fields" }, 400);
      }
    }
    c.set("userId", key.userId);
    c.set("syncKey", true);
    await next();
    return;
  }

  const auth = createAuth(c.env, c.req.raw);
  const session = await auth.api.getSession({ headers: c.req.raw.headers });

  if (!session) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  c.set("userId", session.user.id);
  await next();
});
