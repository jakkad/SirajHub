import { Hono } from "hono";
import { and, asc, eq, like, or } from "drizzle-orm";
import { createDb } from "../db/client";
import { items } from "../db/schema";
import { ulid } from "ulidx";
import { resolveAiQueueIntervalMinutes } from "../lib/user-settings";
import { getRunAfterFromInterval, queueAiJob, syncSuggestMetrics } from "../services/ai-queue";
import type { Env } from "../types";

type Variables = { userId: string };

const VALID_CONTENT_TYPES = new Set(["book", "movie", "tv", "podcast", "youtube", "article", "tweet"]);
const VALID_STATUSES = new Set(["suggestions", "in_progress", "finished", "archived"]);

const router = new Hono<{ Bindings: Env; Variables: Variables }>();

// GET /api/items — list items for current user
// Supports ?status=, ?content_type=, ?q= (full-text search on title + creator)
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
    .orderBy(asc(items.position), asc(items.createdAt));

  const synced = await syncSuggestMetrics(db, result);
  return c.json(synced);
});

// POST /api/items — create item
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
    rating?: number;
    notes?: string;
    sourceUrl?: string;
  }>();

  if (!body.title || !body.contentType) {
    return c.json({ error: "title and contentType are required" }, 400);
  }

  const db = createDb(c.env.DB);
  const now = Date.now();
  const id = ulid();

  await db.insert(items).values({
    id,
    userId,
    title: body.title,
    contentType: body.contentType,
    status: body.status ?? "suggestions",
    creator: body.creator ?? null,
    description: body.description ?? null,
    coverUrl: body.coverUrl ?? null,
    releaseDate: body.releaseDate ?? null,
    rating: body.rating ?? null,
    notes: body.notes ?? null,
    sourceUrl: body.sourceUrl ?? null,
    position: 0,
    createdAt: now,
    updatedAt: now,
  });

  const intervalMinutes = await resolveAiQueueIntervalMinutes(db, userId);
  await queueAiJob(
    db,
    userId,
    "score_item",
    { itemId: id },
    getRunAfterFromInterval(intervalMinutes),
    id
  );

  const [newItem] = await db.select().from(items).where(eq(items.id, id));
  return c.json(newItem, 201);
});

// POST /api/items/import/csv — bulk create items from CSV-parsed rows
router.post("/import/csv", async (c) => {
  const userId = c.get("userId");
  const body = await c.req.json<{ rows?: Array<{
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
  }> }>();

  const rows = body.rows ?? [];
  if (!Array.isArray(rows) || rows.length === 0) {
    return c.json({ error: "rows are required" }, 400);
  }

  const db = createDb(c.env.DB);
  const createdIds: string[] = [];
  const errors: Array<{ row: number; title?: string; error: string }> = [];

  for (const [index, row] of rows.entries()) {
    const rowNumber = index + 2;
    const title = row.title?.trim();
    const contentType = row.contentType?.trim();
    const status = row.status?.trim() || "suggestions";

    if (!title) {
      errors.push({ row: rowNumber, error: "Missing title." });
      continue;
    }

    if (!contentType || !VALID_CONTENT_TYPES.has(contentType)) {
      errors.push({ row: rowNumber, title, error: "Unsupported content type." });
      continue;
    }

    if (!VALID_STATUSES.has(status)) {
      errors.push({ row: rowNumber, title, error: "Unsupported status." });
      continue;
    }

    const rating = row.rating ?? null;
    if (rating != null && (!Number.isInteger(rating) || rating < 1 || rating > 5)) {
      errors.push({ row: rowNumber, title, error: "Rating must be an integer from 1 to 5." });
      continue;
    }

    const now = Date.now();
    const id = ulid();

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
      position: 0,
      createdAt: now,
      updatedAt: now,
    });

    createdIds.push(id);

    const intervalMinutes = await resolveAiQueueIntervalMinutes(db, userId);
    await queueAiJob(
      db,
      userId,
      "score_item",
      { itemId: id },
      getRunAfterFromInterval(intervalMinutes),
      id
    );
  }

  const created = createdIds.length > 0
    ? await db.select().from(items).where(or(...createdIds.map((id) => eq(items.id, id)))!)
    : [];

  return c.json({
    created,
    createdCount: created.length,
    failedCount: errors.length,
    errors,
  }, 201);
});

// PATCH /api/items/:id — update item fields
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
      sourceUrl: string | null;
      rating: number | null;
      notes: string | null;
      position: number;
      startedAt: number | null;
      finishedAt: number | null;
      trendingBoostEnabled: boolean | null;
    }>
  >();

  const db = createDb(c.env.DB);

  const [existing] = await db
    .select({ id: items.id, status: items.status, startedAt: items.startedAt, finishedAt: items.finishedAt })
    .from(items)
    .where(and(eq(items.id, id), eq(items.userId, userId)));

  if (!existing) return c.json({ error: "Not found" }, 404);

  // Build update object with only provided fields
  const now = Date.now();
  const update: Record<string, unknown> = { updatedAt: now };
  const allowed = [
    "title", "contentType", "status", "creator", "description",
    "coverUrl", "releaseDate", "sourceUrl", "rating", "notes", "position",
    "startedAt", "finishedAt", "trendingBoostEnabled",
  ] as const;
  for (const key of allowed) {
    if (key in body) update[key] = body[key];
  }

  // Auto-timestamp on status transitions (only when not explicitly provided)
  if ("status" in body && body.status !== existing.status) {
    if (body.status === "in_progress" && existing.startedAt == null && !("startedAt" in body)) {
      update.startedAt = now;
    }
    if (body.status === "finished" && existing.finishedAt == null && !("finishedAt" in body)) {
      update.finishedAt = now;
    }
  }

  await db
    .update(items)
    .set(update)
    .where(and(eq(items.id, id), eq(items.userId, userId)));

  let [updated] = await db.select().from(items).where(eq(items.id, id));

  const scoringRelevantKeys = ["title", "contentType", "creator", "description", "releaseDate", "sourceUrl"] as const;
  const shouldQueueRescore = scoringRelevantKeys.some((key) => key in body);

  if (updated) {
    const [synced] = await syncSuggestMetrics(db, [updated]);
    updated = synced ?? updated;
  }

  if (updated && shouldQueueRescore) {
    const intervalMinutes = await resolveAiQueueIntervalMinutes(db, userId);
    await queueAiJob(
      db,
      userId,
      "score_item",
      { itemId: id },
      getRunAfterFromInterval(intervalMinutes),
      id
    );
  }

  return c.json(updated);
});

// DELETE /api/items/:id — hard delete
router.delete("/:id", async (c) => {
  const userId = c.get("userId");
  const id = c.req.param("id");
  const db = createDb(c.env.DB);

  const [existing] = await db
    .select({ id: items.id })
    .from(items)
    .where(and(eq(items.id, id), eq(items.userId, userId)));

  if (!existing) return c.json({ error: "Not found" }, 404);

  await db
    .delete(items)
    .where(and(eq(items.id, id), eq(items.userId, userId)));

  return c.json({ ok: true });
});

export default router;
