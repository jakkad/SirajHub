import type { D1Database, KVNamespace } from "@cloudflare/workers-types";

export interface Env {
  // Cloudflare D1 — primary database
  DB: D1Database;

  // Cloudflare KV — session cache + URL metadata cache
  SIRAJHUB_KV: KVNamespace;

  // Secrets — set via: wrangler secret put <NAME>
  AUTH_SECRET: string;
  GEMINI_API_KEY: string;
  TMDB_API_KEY: string;
  YOUTUBE_API_KEY: string;
  GOOGLE_BOOKS_API_KEY: string;
  PODCAST_INDEX_KEY: string;
  PODCAST_INDEX_SECRET: string;
}
