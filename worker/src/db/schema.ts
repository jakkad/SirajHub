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
  // Per-user API keys, AI model preference, and queue settings (JSON blob)
  // Shape: { gemini?, tmdb?, youtube?, googleBooks?, podcastIndexKey?, podcastIndexSecret?, aiModel?, aiQueueIntervalMinutes? }
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
    progressPercent: integer("progress_percent"),
    progressCurrent: integer("progress_current"),
    progressTotal: integer("progress_total"),
    lastTouchedAt: integer("last_touched_at"),
    suggestMetricBase: integer("suggest_metric_base"),
    suggestMetricFinal: integer("suggest_metric_final"),
    suggestMetricUpdatedAt: integer("suggest_metric_updated_at"),
    suggestMetricReason: text("suggest_metric_reason"),
    suggestMetricNeedsMoreInfo: integer("suggest_metric_needs_more_info", { mode: "boolean" }).notNull().default(false),
    suggestMetricMoreInfoRequest: text("suggest_metric_more_info_request"),
    suggestMetricModelUsed: text("suggest_metric_model_used"),
    trendingBoostEnabled: integer("trending_boost_enabled", { mode: "boolean" }).notNull().default(false),
    hiddenFromRecommendations: integer("hidden_from_recommendations", { mode: "boolean" }).notNull().default(false),
    manualBoost: integer("manual_boost").notNull().default(0),
    cooldownUntil: integer("cooldown_until"),

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

// ── Saved Views ───────────────────────────────────────────────────────────────
export const savedViews = sqliteTable(
  "saved_views",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    scope: text("scope").notNull().default("collection"), // 'collection' | 'dashboard'
    contentType: text("content_type"),
    filters: text("filters").notNull(), // JSON blob
    createdAt: integer("created_at").notNull(),
    updatedAt: integer("updated_at").notNull(),
  },
  (t) => [
    index("idx_saved_views_user_scope").on(t.userId, t.scope),
    index("idx_saved_views_user_type").on(t.userId, t.contentType),
  ]
);

// ── Import Jobs ───────────────────────────────────────────────────────────────
export const importJobs = sqliteTable(
  "import_jobs",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    source: text("source").notNull(), // 'csv' | future importer ids
    sourceLabel: text("source_label").notNull(),
    status: text("status").notNull().default("queued"), // 'queued' | 'processing' | 'completed' | 'failed'
    duplicateStrategy: text("duplicate_strategy").notNull().default("skip"), // 'skip' | future strategies
    totalRows: integer("total_rows").notNull().default(0),
    createdCount: integer("created_count").notNull().default(0),
    duplicateCount: integer("duplicate_count").notNull().default(0),
    failedCount: integer("failed_count").notNull().default(0),
    metadata: text("metadata"), // JSON blob
    result: text("result"), // JSON blob
    lastError: text("last_error"),
    completedAt: integer("completed_at"),
    createdAt: integer("created_at").notNull(),
    updatedAt: integer("updated_at").notNull(),
  },
  (t) => [index("idx_import_jobs_user_created").on(t.userId, t.createdAt)]
);

// ── Import Source Mappings ───────────────────────────────────────────────────
export const importSourceMappings = sqliteTable(
  "import_source_mappings",
  {
    id: text("id").primaryKey(),
    importJobId: text("import_job_id")
      .notNull()
      .references(() => importJobs.id, { onDelete: "cascade" }),
    itemId: text("item_id").references(() => items.id, { onDelete: "cascade" }),
    duplicateOfItemId: text("duplicate_of_item_id").references(() => items.id, { onDelete: "cascade" }),
    source: text("source").notNull(),
    sourceRecordId: text("source_record_id"),
    sourceUrl: text("source_url"),
    rawTitle: text("raw_title"),
    rawCreator: text("raw_creator"),
    payload: text("payload"),
    status: text("status").notNull().default("created"), // 'created' | 'duplicate' | 'failed'
    createdAt: integer("created_at").notNull(),
  },
  (t) => [
    index("idx_import_source_mappings_job").on(t.importJobId),
    index("idx_import_source_mappings_item").on(t.itemId),
    index("idx_import_source_mappings_source_record").on(t.source, t.sourceRecordId),
  ]
);

// ── Custom Lists / Collections ───────────────────────────────────────────────
export const lists = sqliteTable(
  "lists",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    description: text("description"),
    color: text("color").notNull().default("#94a3b8"),
    position: integer("position").notNull().default(0),
    createdAt: integer("created_at").notNull(),
    updatedAt: integer("updated_at").notNull(),
  },
  (t) => [index("idx_lists_user_position").on(t.userId, t.position)]
);

export const listItems = sqliteTable(
  "list_items",
  {
    listId: text("list_id")
      .notNull()
      .references(() => lists.id, { onDelete: "cascade" }),
    itemId: text("item_id")
      .notNull()
      .references(() => items.id, { onDelete: "cascade" }),
    position: integer("position").notNull().default(0),
    addedAt: integer("added_at").notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.listId, t.itemId] }),
    index("idx_list_items_list_position").on(t.listId, t.position),
    index("idx_list_items_item").on(t.itemId),
  ]
);

// ── Reminders / Resurfacing ──────────────────────────────────────────────────
export const reminderStates = sqliteTable(
  "reminder_states",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    itemId: text("item_id")
      .notNull()
      .references(() => items.id, { onDelete: "cascade" }),
    reminderType: text("reminder_type").notNull(), // 'untouched_30_days' | 'resume_in_progress' | 'high_score_waiting'
    status: text("status").notNull().default("active"), // 'active' | 'dismissed' | 'snoozed'
    snoozedUntil: integer("snoozed_until"),
    dismissedAt: integer("dismissed_at"),
    createdAt: integer("created_at").notNull(),
    updatedAt: integer("updated_at").notNull(),
  },
  (t) => [
    index("idx_reminder_states_user_type").on(t.userId, t.reminderType),
    index("idx_reminder_states_item_type").on(t.itemId, t.reminderType),
  ]
);

// ── Structured Notes / Highlights / Quotes ──────────────────────────────────
export const noteEntries = sqliteTable(
  "note_entries",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    itemId: text("item_id")
      .notNull()
      .references(() => items.id, { onDelete: "cascade" }),
    entryType: text("entry_type").notNull(), // 'highlight' | 'quote' | 'takeaway' | 'reflection'
    content: text("content").notNull(),
    context: text("context"),
    position: integer("position").notNull().default(0),
    createdAt: integer("created_at").notNull(),
    updatedAt: integer("updated_at").notNull(),
  },
  (t) => [
    index("idx_note_entries_item_position").on(t.itemId, t.position),
    index("idx_note_entries_user_type").on(t.userId, t.entryType),
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
  analysisType: text("analysis_type").notNull(), // 'summary'
  modelUsed: text("model_used").notNull(), // e.g. 'gemini-2.5-flash-lite'
  promptHash: text("prompt_hash").notNull(), // SHA-256 of the prompt — detect stale cache
  result: text("result").notNull(), // JSON string from Gemini
  createdAt: integer("created_at").notNull(),
});

// ── AI Jobs Queue ────────────────────────────────────────────────────────────
export const aiJobs = sqliteTable(
  "ai_jobs",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    itemId: text("item_id").references(() => items.id, { onDelete: "cascade" }),
    jobType: text("job_type").notNull(), // 'analyze_item' | 'score_item'
    status: text("status").notNull().default("queued"), // 'queued' | 'processing' | 'completed' | 'failed'
    payload: text("payload").notNull(), // JSON blob
    result: text("result"), // JSON blob
    modelUsed: text("model_used"),
    attempts: integer("attempts").notNull().default(0),
    maxAttempts: integer("max_attempts").notNull().default(3),
    lastError: text("last_error"),
    runAfter: integer("run_after").notNull(),
    completedAt: integer("completed_at"),
    createdAt: integer("created_at").notNull(),
    updatedAt: integer("updated_at").notNull(),
  },
  (t) => [
    index("idx_ai_jobs_user_status_run_after").on(t.userId, t.status, t.runAfter),
    index("idx_ai_jobs_item_type").on(t.itemId, t.jobType),
  ]
);

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
export type AiJob = typeof aiJobs.$inferSelect;
export type UrlCache = typeof urlCache.$inferSelect;
export type Account = typeof account.$inferSelect;
export type Verification = typeof verification.$inferSelect;
export type SavedView = typeof savedViews.$inferSelect;
export type ImportJob = typeof importJobs.$inferSelect;
export type ImportSourceMapping = typeof importSourceMappings.$inferSelect;
