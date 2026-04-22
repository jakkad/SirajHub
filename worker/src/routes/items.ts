import { Hono } from "hono";
import { and, asc, desc, eq, inArray, like, or } from "drizzle-orm";
import { ulid } from "ulidx";
import { createDb } from "../db/client";
import { importJobs, importSourceMappings, itemTags, items } from "../db/schema";
import { resolveAiQueueIntervalMinutes } from "../lib/user-settings";
import { getRunAfterFromInterval, queueAiJob, syncSuggestMetrics } from "../services/ai-queue";
import type { Env } from "../types";

type Variables = { userId: string };

const VALID_CONTENT_TYPES = new Set(["book", "movie", "tv", "podcast", "youtube", "article", "tweet"]);
const VALID_STATUSES = new Set(["suggestions", "in_progress", "finished", "archived"]);
const VALID_IMPORT_SOURCES = [
  {
    id: "csv",
    label: "CSV Import",
    status: "available",
    description: "Upload a CSV file and import rows with duplicate checking.",
  },
  {
    id: "goodreads",
    label: "Goodreads",
    status: "available",
    description: "Import Goodreads export files and shelf history.",
  },
  {
    id: "letterboxd",
    label: "Letterboxd",
    status: "available",
    description: "Import Letterboxd CSV exports for films, diary, and watchlists.",
  },
  {
    id: "imdb",
    label: "IMDb",
    status: "available",
    description: "Import IMDb export files for ratings and watchlists.",
  },
  {
    id: "trakt",
    label: "Trakt",
    status: "available",
    description: "Import Trakt JSON exports for shows, movies, and progress.",
  },
  {
    id: "pocket",
    label: "Pocket",
    status: "available",
    description: "Import Pocket exports for saved reads and archive state.",
  },
  {
    id: "raindrop",
    label: "Raindrop",
    status: "available",
    description: "Import Raindrop bookmark exports and reading queues.",
  },
  {
    id: "youtube_history",
    label: "YouTube Playlists / History",
    status: "available",
    description: "Import YouTube playlist and history exports.",
  },
  {
    id: "apple_podcasts_opml",
    label: "Apple Podcasts OPML",
    status: "available",
    description: "Import podcast subscriptions from Apple Podcasts OPML exports.",
  },
  {
    id: "x_bookmarks",
    label: "X Bookmarks",
    status: "available",
    description: "Import saved bookmarks exported from X.",
  },
] as const;

type ImportSourceId = (typeof VALID_IMPORT_SOURCES)[number]["id"];

type ImportRowInput = {
  title?: string;
  contentType?: string;
  status?: string;
  creator?: string;
  description?: string;
  coverUrl?: string;
  releaseDate?: string;
  rating?: number;
  notes?: string;
  sourceUrl?: string;
  externalId?: string;
  progressPercent?: number | null;
  progressCurrent?: number | null;
  progressTotal?: number | null;
  sourceRecordId?: string | null;
  sourceMetadata?: unknown;
};

function isValidContentType(value: unknown): value is string {
  return typeof value === "string" && VALID_CONTENT_TYPES.has(value);
}

function isValidStatus(value: unknown): value is string {
  return typeof value === "string" && VALID_STATUSES.has(value);
}

function isValidRating(value: number | null | undefined) {
  return value == null || (Number.isInteger(value) && value >= 1 && value <= 5);
}

function isValidOptionalNonNegativeInteger(value: number | null | undefined) {
  return value == null || (Number.isInteger(value) && value >= 0);
}

function normalizeString(value: string | null | undefined) {
  return (value ?? "").trim().toLowerCase().replace(/\s+/g, " ");
}

type DuplicateReason = "source_url" | "external_id" | "title_creator";

type DuplicateCandidate = {
  item: typeof items.$inferSelect;
  reason: DuplicateReason;
};

type ProgressInput = {
  progressPercent?: number | null;
  progressCurrent?: number | null;
  progressTotal?: number | null;
};

function deriveProgress(input: ProgressInput) {
  const progressCurrent = input.progressCurrent ?? null;
  const progressTotal = input.progressTotal ?? null;
  let progressPercent = input.progressPercent ?? null;

  if (progressCurrent != null && progressTotal != null && progressTotal > 0) {
    progressPercent = Math.max(0, Math.min(100, Math.round((progressCurrent / progressTotal) * 100)));
  }

  return {
    progressPercent,
    progressCurrent,
    progressTotal,
  };
}

async function findDuplicateCandidate(
  db: ReturnType<typeof createDb>,
  userId: string,
  input: {
    sourceUrl?: string | null;
    externalId?: string | null;
    title: string;
    creator?: string | null;
    contentType?: string | null;
  },
  excludeId?: string
): Promise<DuplicateCandidate | null> {
  const sourceUrl = input.sourceUrl?.trim();
  if (sourceUrl) {
    const bySource = await db
      .select()
      .from(items)
      .where(and(eq(items.userId, userId), eq(items.sourceUrl, sourceUrl)));
    const match = bySource.find((entry) => entry.id !== excludeId);
    if (match) return { item: match, reason: "source_url" };
  }

  const externalId = input.externalId?.trim();
  if (externalId) {
    const byExternal = await db
      .select()
      .from(items)
      .where(and(eq(items.userId, userId), eq(items.externalId, externalId)));
    const match = byExternal.find((entry) => entry.id !== excludeId);
    if (match) return { item: match, reason: "external_id" };
  }

  const normalizedTitle = normalizeString(input.title);
  const normalizedCreator = normalizeString(input.creator);
  if (!normalizedTitle) return null;

  const titleCandidates = await db
    .select()
    .from(items)
    .where(and(eq(items.userId, userId), eq(items.title, input.title.trim())));

  const titleMatch = titleCandidates.find((entry) => {
    if (entry.id === excludeId) return false;
    if (input.contentType && entry.contentType !== input.contentType) return false;
    if (normalizeString(entry.title) !== normalizedTitle) return false;
    return normalizeString(entry.creator) === normalizedCreator;
  });

  return titleMatch ? { item: titleMatch, reason: "title_creator" } : null;
}

function serializeDuplicate(candidate: DuplicateCandidate) {
  return {
    id: candidate.item.id,
    title: candidate.item.title,
    creator: candidate.item.creator,
    contentType: candidate.item.contentType,
    status: candidate.item.status,
    coverUrl: candidate.item.coverUrl,
    sourceUrl: candidate.item.sourceUrl,
    reason: candidate.reason,
  };
}

function buildUpdatePayload(body: Record<string, unknown>, allowed: readonly string[]) {
  const payload: Record<string, unknown> = {};
  for (const key of allowed) {
    if (key in body) payload[key] = body[key];
  }
  return payload;
}

function buildDuplicateScan(itemsList: Array<typeof items.$inferSelect>) {
  const groups = new Map<string, { reason: DuplicateReason; items: Array<typeof items.$inferSelect> }>();

  const addToGroup = (key: string, reason: DuplicateReason, item: typeof items.$inferSelect) => {
    const existing = groups.get(key);
    if (existing) {
      if (!existing.items.some((entry) => entry.id === item.id)) {
        existing.items.push(item);
      }
      return;
    }
    groups.set(key, { reason, items: [item] });
  };

  for (const item of itemsList) {
    const sourceKey = item.sourceUrl?.trim().toLowerCase();
    if (sourceKey) addToGroup(`source:${sourceKey}`, "source_url", item);

    const externalKey = item.externalId?.trim().toLowerCase();
    if (externalKey) addToGroup(`external:${externalKey}`, "external_id", item);

    const titleKey = normalizeString(item.title);
    const creatorKey = normalizeString(item.creator);
    if (titleKey && creatorKey) addToGroup(`title:${item.contentType}:${titleKey}:${creatorKey}`, "title_creator", item);
  }

  return [...groups.entries()]
    .map(([key, value]) => ({
      id: key,
      reason: value.reason,
      items: value.items.sort((a, b) => b.updatedAt - a.updatedAt),
    }))
    .filter((group) => group.items.length > 1);
}

async function runImportJob(
  db: ReturnType<typeof createDb>,
  userId: string,
  source: ImportSourceId,
  rows: ImportRowInput[],
  options?: { resyncMetadata?: boolean }
) {
  const sourceMeta = VALID_IMPORT_SOURCES.find((entry) => entry.id === source) ?? VALID_IMPORT_SOURCES[0];
  const now = Date.now();
  const importJobId = ulid();

  await db.insert(importJobs).values({
    id: importJobId,
    userId,
    source,
    sourceLabel: sourceMeta.label,
    status: "processing",
    duplicateStrategy: "skip",
    totalRows: rows.length,
    createdAt: now,
    updatedAt: now,
    metadata: JSON.stringify({ source, fileRows: rows.length }),
  });

  const createdIds: string[] = [];
  const duplicates: Array<{ row: number; title?: string; duplicate: ReturnType<typeof serializeDuplicate> }> = [];
  const errors: Array<{ row: number; title?: string; error: string }> = [];

  for (const [index, row] of rows.entries()) {
    const rowNumber = index + 2;
    const title = row.title?.trim();
    const contentType = row.contentType?.trim();
    const status = row.status?.trim() || "suggestions";

    if (!title) {
      errors.push({ row: rowNumber, error: "Missing title." });
      await db.insert(importSourceMappings).values({
        id: ulid(),
        importJobId,
        source,
        sourceRecordId: row.sourceRecordId ?? null,
        sourceUrl: row.sourceUrl?.trim() || null,
        rawTitle: row.title?.trim() || null,
        rawCreator: row.creator?.trim() || null,
        payload: row.sourceMetadata ? JSON.stringify(row.sourceMetadata) : null,
        status: "failed",
        createdAt: Date.now(),
      });
      continue;
    }
    if (!isValidContentType(contentType)) {
      errors.push({ row: rowNumber, title, error: "Unsupported content type." });
      await db.insert(importSourceMappings).values({
        id: ulid(),
        importJobId,
        source,
        sourceRecordId: row.sourceRecordId ?? null,
        sourceUrl: row.sourceUrl?.trim() || null,
        rawTitle: title,
        rawCreator: row.creator?.trim() || null,
        payload: row.sourceMetadata ? JSON.stringify(row.sourceMetadata) : null,
        status: "failed",
        createdAt: Date.now(),
      });
      continue;
    }
    if (!isValidStatus(status)) {
      errors.push({ row: rowNumber, title, error: "Unsupported status." });
      await db.insert(importSourceMappings).values({
        id: ulid(),
        importJobId,
        source,
        sourceRecordId: row.sourceRecordId ?? null,
        sourceUrl: row.sourceUrl?.trim() || null,
        rawTitle: title,
        rawCreator: row.creator?.trim() || null,
        payload: row.sourceMetadata ? JSON.stringify(row.sourceMetadata) : null,
        status: "failed",
        createdAt: Date.now(),
      });
      continue;
    }
    const rating = row.rating ?? null;
    if (!isValidRating(rating)) {
      errors.push({ row: rowNumber, title, error: "Rating must be an integer from 1 to 5." });
      await db.insert(importSourceMappings).values({
        id: ulid(),
        importJobId,
        source,
        sourceRecordId: row.sourceRecordId ?? null,
        sourceUrl: row.sourceUrl?.trim() || null,
        rawTitle: title,
        rawCreator: row.creator?.trim() || null,
        payload: row.sourceMetadata ? JSON.stringify(row.sourceMetadata) : null,
        status: "failed",
        createdAt: Date.now(),
      });
      continue;
    }
    if (
      !isValidOptionalNonNegativeInteger(row.progressPercent ?? null) ||
      !isValidOptionalNonNegativeInteger(row.progressCurrent ?? null) ||
      !isValidOptionalNonNegativeInteger(row.progressTotal ?? null) ||
      (row.progressPercent != null && row.progressPercent > 100)
    ) {
      errors.push({ row: rowNumber, title, error: "Invalid progress values." });
      await db.insert(importSourceMappings).values({
        id: ulid(),
        importJobId,
        source,
        sourceRecordId: row.sourceRecordId ?? null,
        sourceUrl: row.sourceUrl?.trim() || null,
        rawTitle: title,
        rawCreator: row.creator?.trim() || null,
        payload: row.sourceMetadata ? JSON.stringify(row.sourceMetadata) : null,
        status: "failed",
        createdAt: Date.now(),
      });
      continue;
    }

    const duplicate = await findDuplicateCandidate(db, userId, {
      sourceUrl: row.sourceUrl,
      externalId: row.externalId,
      title,
      creator: row.creator,
      contentType,
    });
    if (duplicate) {
      duplicates.push({ row: rowNumber, title, duplicate: serializeDuplicate(duplicate) });
      await db.insert(importSourceMappings).values({
        id: ulid(),
        importJobId,
        duplicateOfItemId: duplicate.item.id,
        source,
        sourceRecordId: row.sourceRecordId ?? null,
        sourceUrl: row.sourceUrl?.trim() || null,
        rawTitle: title,
        rawCreator: row.creator?.trim() || null,
        payload: row.sourceMetadata ? JSON.stringify(row.sourceMetadata) : null,
        status: "duplicate",
        createdAt: Date.now(),
      });
      continue;
    }

    const id = ulid();
    const itemNow = Date.now();
    const progress = deriveProgress(row);

    // Movies don't track current/total — progress is 100% when finished, 0% otherwise
    if (contentType === "movie") {
      progress.progressPercent = status === "finished" ? 100 : 0;
      progress.progressCurrent = null;
      progress.progressTotal = null;
    }

    await db.insert(items).values({
      id,
      userId,
      title,
      contentType,
      status,
      creator: row.creator?.trim() || null,
      description: row.description?.trim() || null,
      coverUrl: row.coverUrl?.trim() || null,
      releaseDate: row.releaseDate?.trim() || null,
      rating,
      notes: row.notes?.trim() || null,
      sourceUrl: row.sourceUrl?.trim() || null,
      externalId: row.externalId?.trim() || null,
      position: 0,
      progressPercent: progress.progressPercent,
      progressCurrent: progress.progressCurrent,
      progressTotal: progress.progressTotal,
      lastTouchedAt:
        progress.progressPercent != null || progress.progressCurrent != null || progress.progressTotal != null ? itemNow : null,
      finishedAt: status === "finished" ? itemNow : null,
      createdAt: itemNow,
      updatedAt: itemNow,
    });

    createdIds.push(id);

    await db.insert(importSourceMappings).values({
      id: ulid(),
      importJobId,
      itemId: id,
      source,
      sourceRecordId: row.sourceRecordId ?? null,
      sourceUrl: row.sourceUrl?.trim() || null,
      rawTitle: title,
      rawCreator: row.creator?.trim() || null,
      payload: row.sourceMetadata ? JSON.stringify(row.sourceMetadata) : null,
      status: "created",
      createdAt: Date.now(),
    });

    const intervalMinutes = await resolveAiQueueIntervalMinutes(db, userId);
    if (options?.resyncMetadata) {
      await queueAiJob(db, userId, "fetch_metadata", { itemId: id }, getRunAfterFromInterval(intervalMinutes), id);
    } else {
      await queueAiJob(db, userId, "score_item", { itemId: id }, getRunAfterFromInterval(intervalMinutes), id);
    }
  }

  const created =
    createdIds.length > 0
      ? await db.select().from(items).where(inArray(items.id, createdIds))
      : [];

  await db
    .update(importJobs)
    .set({
      status: "completed",
      createdCount: created.length,
      duplicateCount: duplicates.length,
      failedCount: errors.length,
      result: JSON.stringify({
        createdCount: created.length,
        duplicateCount: duplicates.length,
        failedCount: errors.length,
        duplicates,
        errors,
      }),
      completedAt: Date.now(),
      updatedAt: Date.now(),
    })
    .where(eq(importJobs.id, importJobId));

  return {
    created,
    createdCount: created.length,
    duplicateCount: duplicates.length,
    failedCount: errors.length,
    duplicates,
    errors,
    importJobId,
  };
}

const router = new Hono<{ Bindings: Env; Variables: Variables }>();

router.get("/", async (c) => {
  const userId = c.get("userId");
  const { status, content_type, q } = c.req.query();
  const db = createDb(c.env.DB);

  const conditions = [eq(items.userId, userId)];
  if (status) conditions.push(eq(items.status, status));
  if (content_type) conditions.push(eq(items.contentType, content_type));
  if (q?.trim()) {
    const pattern = `%${q.trim()}%`;
    conditions.push(or(like(items.title, pattern), like(items.creator, pattern))!);
  }

  const result = await db
    .select()
    .from(items)
    .where(and(...conditions))
    .orderBy(desc(items.updatedAt), desc(items.createdAt));

  const synced = await syncSuggestMetrics(db, result);
  return c.json(synced);
});

router.get("/duplicates", async (c) => {
  const userId = c.get("userId");
  const db = createDb(c.env.DB);

  const allItems = await db
    .select()
    .from(items)
    .where(eq(items.userId, userId))
    .orderBy(desc(items.updatedAt));

  const groups = buildDuplicateScan(allItems);

  return c.json({
    groups: groups.map((group) => ({
      id: group.id,
      reason: group.reason,
      items: group.items.map((item) => ({
        id: item.id,
        title: item.title,
        creator: item.creator,
        contentType: item.contentType,
        status: item.status,
        coverUrl: item.coverUrl,
        sourceUrl: item.sourceUrl,
        updatedAt: item.updatedAt,
      })),
    })),
  });
});

router.get("/import/sources", (c) => {
  return c.json({ sources: VALID_IMPORT_SOURCES });
});

router.get("/import/jobs", async (c) => {
  const userId = c.get("userId");
  const db = createDb(c.env.DB);

  const jobs = await db
    .select()
    .from(importJobs)
    .where(eq(importJobs.userId, userId))
    .orderBy(desc(importJobs.createdAt));

  return c.json({
    jobs: jobs.map((job) => ({
      ...job,
      metadata: job.metadata ? JSON.parse(job.metadata) : null,
      result: job.result ? JSON.parse(job.result) : null,
    })),
  });
});

router.post("/", async (c) => {
  const userId = c.get("userId");
  const body = await c.req.json<{
    title: string;
    contentType: string;
    status?: string;
    creator?: string;
    description?: string;
    coverUrl?: string;
    releaseDate?: string;
    durationMins?: number;
    rating?: number;
    notes?: string;
    sourceUrl?: string;
    externalId?: string;
    metadata?: string | null;
    progressPercent?: number | null;
    progressCurrent?: number | null;
    progressTotal?: number | null;
    finishedAt?: number | null;
  }>();

  if (!body.title || !body.contentType) {
    return c.json({ error: "title and contentType are required" }, 400);
  }
  if (!isValidContentType(body.contentType)) {
    return c.json({ error: "Unsupported content type" }, 400);
  }
  if (body.status !== undefined && !isValidStatus(body.status)) {
    return c.json({ error: "Unsupported status" }, 400);
  }
  if (!isValidRating(body.rating ?? null)) {
    return c.json({ error: "Rating must be an integer from 1 to 5." }, 400);
  }
  if (
    !isValidOptionalNonNegativeInteger(body.durationMins ?? null) ||
    !isValidOptionalNonNegativeInteger(body.progressPercent ?? null) ||
    !isValidOptionalNonNegativeInteger(body.progressCurrent ?? null) ||
    !isValidOptionalNonNegativeInteger(body.progressTotal ?? null) ||
    (body.progressPercent != null && body.progressPercent > 100)
  ) {
    return c.json({ error: "Duration and progress values must be non-negative integers and percent must be 0–100." }, 400);
  }

  const db = createDb(c.env.DB);
  const duplicate = await findDuplicateCandidate(db, userId, {
    sourceUrl: body.sourceUrl,
    externalId: body.externalId,
    title: body.title,
    creator: body.creator,
    contentType: body.contentType,
  });

  if (duplicate) {
    return c.json(
      {
        error: "Potential duplicate detected",
        duplicate: serializeDuplicate(duplicate),
      },
      409
    );
  }

  const now = Date.now();
  const id = ulid();
  const effectiveStatus = body.status ?? "suggestions";
  const progress = deriveProgress(body);

  // Movies don't track current/total — progress is 100% when finished, 0% otherwise
  if (body.contentType === "movie") {
    progress.progressPercent = effectiveStatus === "finished" ? 100 : 0;
    progress.progressCurrent = null;
    progress.progressTotal = null;
  }

  await db.insert(items).values({
    id,
    userId,
    title: body.title.trim(),
    contentType: body.contentType,
    status: effectiveStatus,
    creator: body.creator?.trim() || null,
    description: body.description?.trim() || null,
    coverUrl: body.coverUrl?.trim() || null,
    releaseDate: body.releaseDate?.trim() || null,
    durationMins: body.durationMins ?? null,
    rating: body.rating ?? null,
    notes: body.notes?.trim() || null,
    sourceUrl: body.sourceUrl?.trim() || null,
    externalId: body.externalId?.trim() || null,
    metadata: body.metadata?.trim() || null,
    position: 0,
    progressPercent: progress.progressPercent,
    progressCurrent: progress.progressCurrent,
    progressTotal: progress.progressTotal,
    lastTouchedAt:
      progress.progressPercent != null || progress.progressCurrent != null || progress.progressTotal != null ? now : null,
    finishedAt: body.finishedAt ?? (effectiveStatus === "finished" ? now : null),
    createdAt: now,
    updatedAt: now,
  });

  const intervalMinutes = await resolveAiQueueIntervalMinutes(db, userId);
  await queueAiJob(db, userId, "score_item", { itemId: id }, getRunAfterFromInterval(intervalMinutes), id);

  const [newItem] = await db.select().from(items).where(eq(items.id, id));
  return c.json(newItem, 201);
});

router.post("/merge", async (c) => {
  const userId = c.get("userId");
  const body = await c.req.json<{ sourceId: string; targetId: string }>();
  if (!body.sourceId || !body.targetId || body.sourceId === body.targetId) {
    return c.json({ error: "sourceId and targetId are required and must be different" }, 400);
  }

  const db = createDb(c.env.DB);
  const found = await db
    .select()
    .from(items)
    .where(and(eq(items.userId, userId), or(eq(items.id, body.sourceId), eq(items.id, body.targetId))!));

  const source = found.find((entry) => entry.id === body.sourceId);
  const target = found.find((entry) => entry.id === body.targetId);
  if (!source || !target) return c.json({ error: "Items not found" }, 404);

  const now = Date.now();
  const mergedNotes = [target.notes, source.notes].filter(Boolean).join("\n\n").trim() || null;
  const mergedProgressCurrent = Math.max(target.progressCurrent ?? 0, source.progressCurrent ?? 0) || null;
  const mergedProgressTotal = Math.max(target.progressTotal ?? 0, source.progressTotal ?? 0) || null;
  const mergedProgressPercent =
    mergedProgressCurrent != null && mergedProgressTotal != null && mergedProgressTotal > 0
      ? Math.min(100, Math.round((mergedProgressCurrent / mergedProgressTotal) * 100))
      : Math.max(target.progressPercent ?? 0, source.progressPercent ?? 0) || null;
  const mergedManualBoost = Math.max(target.manualBoost ?? 0, source.manualBoost ?? 0);
  const mergedCooldownUntil = Math.max(target.cooldownUntil ?? 0, source.cooldownUntil ?? 0) || null;

  await db
    .update(items)
    .set({
      sourceUrl: target.sourceUrl ?? source.sourceUrl,
      externalId: target.externalId ?? source.externalId,
      subtitle: target.subtitle ?? source.subtitle,
      creator: target.creator ?? source.creator,
      description: target.description ?? source.description,
      coverUrl: target.coverUrl ?? source.coverUrl,
      releaseDate: target.releaseDate ?? source.releaseDate,
      durationMins: target.durationMins ?? source.durationMins,
      metadata: target.metadata ?? source.metadata,
      rating: target.rating ?? source.rating,
      notes: mergedNotes,
      progressCurrent: mergedProgressCurrent,
      progressTotal: mergedProgressTotal,
      progressPercent: mergedProgressPercent,
      lastTouchedAt: Math.max(target.lastTouchedAt ?? 0, source.lastTouchedAt ?? 0) || null,
      hiddenFromRecommendations: target.hiddenFromRecommendations || source.hiddenFromRecommendations,
      manualBoost: mergedManualBoost,
      cooldownUntil: mergedCooldownUntil,
      updatedAt: now,
    })
    .where(and(eq(items.id, target.id), eq(items.userId, userId)));

  const sourceTags = await db.select().from(itemTags).where(eq(itemTags.itemId, source.id));
  for (const sourceTag of sourceTags) {
    await db
      .insert(itemTags)
      .values({ itemId: target.id, tagId: sourceTag.tagId })
      .onConflictDoNothing();
  }

  await db.delete(items).where(and(eq(items.id, source.id), eq(items.userId, userId)));

  const [updated] = await db.select().from(items).where(eq(items.id, target.id));
  return c.json(updated);
});

router.post("/import/csv", async (c) => {
  const userId = c.get("userId");
  const body = await c.req.json<{ rows?: ImportRowInput[]; resyncMetadata?: boolean }>();

  const rows = body.rows ?? [];
  if (!Array.isArray(rows) || rows.length === 0) {
    return c.json({ error: "rows are required" }, 400);
  }

  const db = createDb(c.env.DB);
  const result = await runImportJob(db, userId, "csv", rows, { resyncMetadata: body.resyncMetadata });
  return c.json(result, 201);
});

router.post("/import/source", async (c) => {
  const userId = c.get("userId");
  const body = await c.req.json<{ source?: ImportSourceId; rows?: ImportRowInput[]; resyncMetadata?: boolean }>();
  const source = body.source;
  const rows = body.rows ?? [];

  if (!source || !VALID_IMPORT_SOURCES.some((entry) => entry.id === source)) {
    return c.json({ error: "Supported source is required" }, 400);
  }
  if (!Array.isArray(rows) || rows.length === 0) {
    return c.json({ error: "rows are required" }, 400);
  }

  const db = createDb(c.env.DB);
  const result = await runImportJob(db, userId, source, rows, { resyncMetadata: body.resyncMetadata });
  return c.json(result, 201);
});

router.patch("/:id", async (c) => {
  const userId = c.get("userId");
  const id = c.req.param("id");
  const body = await c.req.json<
    Partial<{
      title: string;
      contentType: string;
      status: string;
      creator: string | null;
      description: string | null;
      coverUrl: string | null;
      releaseDate: string | null;
      durationMins: number | null;
      sourceUrl: string | null;
      externalId: string | null;
      metadata: string | null;
      rating: number | null;
      notes: string | null;
      position: number;
      startedAt: number | null;
      finishedAt: number | null;
      trendingBoostEnabled: boolean | null;
      hiddenFromRecommendations: boolean | null;
      manualBoost: number | null;
      cooldownUntil: number | null;
      progressPercent: number | null;
      progressCurrent: number | null;
      progressTotal: number | null;
      lastTouchedAt: number | null;
    }>
  >();

  const db = createDb(c.env.DB);

  if (body.contentType !== undefined && !isValidContentType(body.contentType)) {
    return c.json({ error: "Unsupported content type" }, 400);
  }
  if (body.status !== undefined && !isValidStatus(body.status)) {
    return c.json({ error: "Unsupported status" }, 400);
  }
  if (!isValidRating(body.rating)) {
    return c.json({ error: "Rating must be an integer from 1 to 5." }, 400);
  }
  if (
    !isValidOptionalNonNegativeInteger(body.durationMins ?? null) ||
    !isValidOptionalNonNegativeInteger(body.progressPercent ?? null) ||
    !isValidOptionalNonNegativeInteger(body.progressCurrent ?? null) ||
    !isValidOptionalNonNegativeInteger(body.progressTotal ?? null) ||
    !isValidOptionalNonNegativeInteger(body.lastTouchedAt ?? null) ||
    (body.progressPercent != null && body.progressPercent > 100)
  ) {
    return c.json({ error: "Duration and progress values must be non-negative integers and percent must be 0–100." }, 400);
  }
  if (!isValidOptionalNonNegativeInteger(body.manualBoost ?? null)) {
    return c.json({ error: "Manual boost must be a non-negative integer." }, 400);
  }
  if (!isValidOptionalNonNegativeInteger(body.cooldownUntil ?? null)) {
    return c.json({ error: "Cooldown must be a valid timestamp." }, 400);
  }

  const [existing] = await db
    .select({
      id: items.id,
      status: items.status,
      startedAt: items.startedAt,
      finishedAt: items.finishedAt,
      title: items.title,
      creator: items.creator,
      sourceUrl: items.sourceUrl,
      externalId: items.externalId,
      contentType: items.contentType,
    })
    .from(items)
    .where(and(eq(items.id, id), eq(items.userId, userId)));

  if (!existing) return c.json({ error: "Not found" }, 404);

  const duplicate = await findDuplicateCandidate(
    db,
    userId,
    {
      title: body.title ?? existing.title,
      creator: body.creator ?? existing.creator,
      sourceUrl: body.sourceUrl ?? existing.sourceUrl,
      externalId: body.externalId ?? existing.externalId,
      contentType: body.contentType ?? existing.contentType,
    },
    id
  );
  if (duplicate) {
    return c.json(
      {
        error: "Potential duplicate detected",
        duplicate: serializeDuplicate(duplicate),
      },
      409
    );
  }

  const now = Date.now();
  const update: Record<string, unknown> = {
    updatedAt: now,
    ...buildUpdatePayload(body as Record<string, unknown>, [
      "title",
      "contentType",
      "status",
      "creator",
      "description",
      "coverUrl",
      "releaseDate",
      "durationMins",
      "sourceUrl",
      "externalId",
      "metadata",
      "rating",
      "notes",
      "position",
      "startedAt",
      "finishedAt",
      "trendingBoostEnabled",
      "hiddenFromRecommendations",
      "manualBoost",
      "cooldownUntil",
    ]),
  };

  if ("progressPercent" in body || "progressCurrent" in body || "progressTotal" in body) {
    const progress = deriveProgress({
      progressPercent: body.progressPercent,
      progressCurrent: body.progressCurrent,
      progressTotal: body.progressTotal,
    });
    update.progressPercent = progress.progressPercent;
    update.progressCurrent = progress.progressCurrent;
    update.progressTotal = progress.progressTotal;
    update.lastTouchedAt = body.lastTouchedAt ?? now;
  } else if ("lastTouchedAt" in body) {
    update.lastTouchedAt = body.lastTouchedAt;
  }

  if ("status" in body && body.status !== existing.status) {
    if (body.status === "in_progress" && existing.startedAt == null && !("startedAt" in body)) {
      update.startedAt = now;
    }
    if (body.status === "finished" && !("finishedAt" in body)) {
      update.finishedAt = existing.finishedAt ?? now;
    }
    if (body.status !== "finished" && !("finishedAt" in body)) {
      // Keep existing finishedAt — don't clear it on status change back
    }

    // Movies: auto-set progress based purely on status
    if (existing.contentType === "movie" && !("progressPercent" in body) && !("progressCurrent" in body) && !("progressTotal" in body)) {
      update.progressPercent = body.status === "finished" ? 100 : 0;
      update.progressCurrent = null;
      update.progressTotal = null;
    }
  }

  await db
    .update(items)
    .set(update)
    .where(and(eq(items.id, id), eq(items.userId, userId)));

  let [updated] = await db.select().from(items).where(eq(items.id, id));

  const scoringRelevantKeys = [
    "title",
    "contentType",
    "creator",
    "description",
    "releaseDate",
    "sourceUrl",
    "externalId",
  ] as const;
  const shouldQueueRescore = scoringRelevantKeys.some((key) => key in body);

  if (updated) {
    const [synced] = await syncSuggestMetrics(db, [updated]);
    updated = synced ?? updated;
  }

  if (updated && shouldQueueRescore) {
    const intervalMinutes = await resolveAiQueueIntervalMinutes(db, userId);
    await queueAiJob(db, userId, "score_item", { itemId: id }, getRunAfterFromInterval(intervalMinutes), id);
  }

  return c.json(updated);
});

router.post("/bulk-delete", async (c) => {
  const userId = c.get("userId");
  const body = await c.req.json<{ ids: string[] }>();
  const db = createDb(c.env.DB);

  if (!body.ids || !Array.isArray(body.ids) || body.ids.length === 0) {
    return c.json({ error: "No ids provided" }, 400);
  }

  // D1 / SQLite parameter limits generally handle hundreds of items fine using inArray.
  await db
    .delete(items)
    .where(and(inArray(items.id, body.ids), eq(items.userId, userId)));

  return c.json({ ok: true, deletedCount: body.ids.length });
});

router.delete("/:id", async (c) => {
  const userId = c.get("userId");
  const id = c.req.param("id");
  const db = createDb(c.env.DB);

  const [existing] = await db
    .select({ id: items.id })
    .from(items)
    .where(and(eq(items.id, id), eq(items.userId, userId)));

  if (!existing) return c.json({ error: "Not found" }, 404);

  await db.delete(items).where(and(eq(items.id, id), eq(items.userId, userId)));

  return c.json({ ok: true });
});

export default router;
