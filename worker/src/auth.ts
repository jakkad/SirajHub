import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { createDb } from "./db/client";
import * as schema from "./db/schema";
import type { Env } from "./types";

const PBKDF2_PREFIX = "pbkdf2-sha256";
const PBKDF2_ITERATIONS = 100_000;
const PBKDF2_KEY_LENGTH_BITS = 256;

function toHex(bytes: Uint8Array) {
  return [...bytes].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function fromHex(hex: string) {
  if (!/^[0-9a-f]+$/i.test(hex) || hex.length % 2 !== 0) {
    throw new Error("Invalid hex string");
  }

  const bytes = new Uint8Array(hex.length / 2);
  for (let index = 0; index < bytes.length; index++) {
    bytes[index] = Number.parseInt(hex.slice(index * 2, index * 2 + 2), 16);
  }
  return bytes;
}

async function derivePasswordKey(password: string, salt: Uint8Array, iterations: number) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password.normalize("NFKC")),
    "PBKDF2",
    false,
    ["deriveBits"]
  );

  const bits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      hash: "SHA-256",
      salt,
      iterations,
    },
    key,
    PBKDF2_KEY_LENGTH_BITS
  );

  return new Uint8Array(bits);
}

async function hashPassword(password: string) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const key = await derivePasswordKey(password, salt, PBKDF2_ITERATIONS);
  return `${PBKDF2_PREFIX}:${PBKDF2_ITERATIONS}:${toHex(salt)}:${toHex(key)}`;
}

async function verifyPassword({ hash, password }: { hash: string; password: string }) {
  const [prefix, iterationsValue, saltValue, keyValue] = hash.split(":");

  if (prefix !== PBKDF2_PREFIX || !iterationsValue || !saltValue || !keyValue) {
    return false;
  }

  const iterations = Number.parseInt(iterationsValue, 10);
  if (!Number.isSafeInteger(iterations) || iterations <= 0) {
    return false;
  }

  const expected = fromHex(keyValue);
  const actual = await derivePasswordKey(password, fromHex(saltValue), iterations);

  if (actual.length !== expected.length) {
    return false;
  }

  let diff = 0;
  for (let index = 0; index < actual.length; index++) {
    diff |= (actual[index] ?? 0) ^ (expected[index] ?? 0);
  }

  return diff === 0;
}

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
      password: {
        hash: hashPassword,
        verify: verifyPassword,
      },
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
