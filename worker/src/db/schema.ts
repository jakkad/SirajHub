import { sqliteTable, text, integer, primaryKey, index } from "drizzle-orm/sqlite-core";

// ── Users ─────────────────────────────────────────────────────────────────────
// This table is created by Better Auth (Phase 2).
// Defined here so our FK references type-check correctly.
export const user = sqliteTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: integer("email_verified", { mode: "boolean" }).notNull().default(false),
  image: text("image"),
  // Extended field: AI taste profile ("I like hard sci-fi, dislike horror")
  preferences: text("preferences"),
  // Per-user API keys and AI model preference (JSON blob)
  // Shape: { gemini?, tmdb?, youtube?, googleBooks?, podcastIndexKey?, podcastIndexSecret?, aiModel? }
  apiKeys: text("api_keys"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
});

// ── Sessions (managed by Better Auth, Phase 2) ───────────────────────────────
export const session = sqliteTable("session", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  token: text("token").notNull().unique(),
  expiresAt: integer("expires_at", { mode: "timestamp" }).notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
});

// ── Content Items ─────────────────────────────────────────────────────────────
export const items = sqliteTable(
  "items",
  {
    id: text("id").primaryKey(), // ULID
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),

    // Classification
    contentType: text("content_type").notNull(), // 'book'|'movie'|'tv'|'podcast'|'youtube'|'article'|'tweet'
    status: text("status").notNull().default("suggestions"), // 'suggestions'|'in_progress'|'finished'|'archived'

    // Source
    sourceUrl: text("source_url"),
    externalId: text("external_id"), // TMDB ID, Open Library ID, YouTube video ID, etc.

    // Core metadata
    title: text("title").notNull(),
    subtitle: text("subtitle"),
    creator: text("creator"), // author / director / channel / publisher
    description: text("description"),
    coverUrl: text("cover_url"), // poster / thumbnail / book cover URL
    releaseDate: text("release_date"), // ISO date string (YYYY-MM-DD)
    durationMins: integer("duration_mins"), // runtime for movies/episodes

    // Type-specific extras stored as JSON
    // Books: { isbn, pageCount, genres[] }
    // Movies/TV: { tmdbId, genres[], rating, seasons }
    // Podcasts: { feedUrl, episodeCount, publisher }
    // YouTube: { channelId, viewCount, duration }
    // Articles: { siteName, wordCount, readingTimeMins }
    // Tweets: { authorHandle, embedHtml }
    metadata: text("metadata"), // JSON blob

    // User data
    position: integer("position").default(0), // for manual ordering within a status column
    rating: integer("rating"), // user's personal 1–5 rating
    notes: text("notes"), // user's private notes

    // Timestamps (Unix ms integers for fast sorting/filtering)
    startedAt: integer("started_at"),
    finishedAt: integer("finished_at"),
    createdAt: integer("created_at").notNull(),
    updatedAt: integer("updated_at").notNull(),
  },
  (t) => [
    index("idx_items_user_status").on(t.userId, t.status),
    index("idx_items_user_type").on(t.userId, t.contentType),
    index("idx_items_source_url").on(t.sourceUrl),
  ]
);

// ── Tags ──────────────────────────────────────────────────────────────────────
export const tags = sqliteTable("tags", {
  id: text("id").primaryKey(), // ULID
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  color: text("color").notNull().default("#6366f1"), // hex color for tag pill UI
});

export const itemTags = sqliteTable(
  "item_tags",
  {
    itemId: text("item_id")
      .notNull()
      .references(() => items.id, { onDelete: "cascade" }),
    tagId: text("tag_id")
      .notNull()
      .references(() => tags.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.itemId, t.tagId] })]
);

// ── Accounts (managed by Better Auth — stores credentials per provider) ──────
export const account = sqliteTable("account", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: integer("access_token_expires_at", { mode: "timestamp" }),
  refreshTokenExpiresAt: integer("refresh_token_expires_at", { mode: "timestamp" }),
  scope: text("scope"),
  password: text("password"), // hashed password for email/password auth
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
});

// ── Verification tokens (managed by Better Auth) ──────────────────────────────
export const verification = sqliteTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: integer("expires_at", { mode: "timestamp" }).notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }),
  updatedAt: integer("updated_at", { mode: "timestamp" }),
});

// ── AI Analysis Cache ─────────────────────────────────────────────────────────
export const aiCache = sqliteTable("ai_cache", {
  id: text("id").primaryKey(), // ULID
  contentId: text("content_id")
    .notNull()
    .references(() => items.id, { onDelete: "cascade" }),
  analysisType: text("analysis_type").notNull(), // 'summary'|'tags'|'categorize'|'next_rank'
  modelUsed: text("model_used").notNull(), // e.g. 'gemini-2.5-flash-lite'
  promptHash: text("prompt_hash").notNull(), // SHA-256 of the prompt — detect stale cache
  result: text("result").notNull(), // JSON string from Gemini
  createdAt: integer("created_at").notNull(),
});

// ── URL Metadata Cache ────────────────────────────────────────────────────────
// Prevents re-fetching the same external URL within 24 hours
export const urlCache = sqliteTable("url_cache", {
  url: text("url").primaryKey(),
  metadata: text("metadata").notNull(), // JSON — normalized metadata object
  fetchedAt: integer("fetched_at").notNull(),
  source: text("source").notNull(), // 'tmdb'|'openlibrary'|'youtube'|'og_scrape'|etc.
});

// ── Type exports for Drizzle queries ─────────────────────────────────────────
export type User = typeof user.$inferSelect;
export type NewUser = typeof user.$inferInsert;
export type Item = typeof items.$inferSelect;
export type NewItem = typeof items.$inferInsert;
export type Tag = typeof tags.$inferSelect;
export type NewTag = typeof tags.$inferInsert;
export type AiCache = typeof aiCache.$inferSelect;
export type UrlCache = typeof urlCache.$inferSelect;
export type Account = typeof account.$inferSelect;
export type Verification = typeof verification.$inferSelect;
