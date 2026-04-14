import { createMiddleware } from "hono/factory";
import { createAuth } from "../auth";
import type { Env } from "../types";

type Variables = { userId: string };

/**
 * Validates the session cookie / bearer token via Better Auth.
 * Injects userId into Hono context; returns 401 if no valid session.
 * Apply to all /api/* routes (not /auth/*).
 */
export const requireAuth = createMiddleware<{
  Bindings: Env;
  Variables: Variables;
}>(async (c, next) => {
  const auth = createAuth(c.env, c.req.raw);
  const session = await auth.api.getSession({ headers: c.req.raw.headers });

  if (!session) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  c.set("userId", session.user.id);
  await next();
});
