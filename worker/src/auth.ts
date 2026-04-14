import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { createDb } from "./db/client";
import * as schema from "./db/schema";
import type { Env } from "./types";

/**
 * Create a Better Auth instance bound to the current request's D1 database.
 * Called per-request because Cloudflare Workers expose D1 only at request time.
 *
 * Pass the raw request so we can derive the baseURL dynamically — this makes
 * auth work on localhost, workers.dev, and any custom domain without hardcoding URLs.
 */
export function createAuth(env: Env, request?: Request) {
  const db = createDb(env.DB);

  // Derive the origin from the actual incoming request (prod + dev + custom domains)
  const origin = request ? new URL(request.url).origin : "http://localhost:5173";

  return betterAuth({
    secret: env.AUTH_SECRET,
    baseURL: origin,
    database: drizzleAdapter(db, {
      provider: "sqlite",
      schema: {
        user: schema.user,
        session: schema.session,
        account: schema.account,
        verification: schema.verification,
      },
    }),
    emailAndPassword: {
      enabled: true,
      requireEmailVerification: false,
    },
    trustedOrigins: [
      origin,
      "http://localhost:5173",
      "http://localhost:8787",
      "http://127.0.0.1:5173",
      "http://127.0.0.1:8787",
    ],
  });
}

export type Auth = ReturnType<typeof createAuth>;
