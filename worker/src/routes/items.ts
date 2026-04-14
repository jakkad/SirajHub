import { Hono } from "hono";
import { and, asc, eq, like, or } from "drizzle-orm";
import { createDb } from "../db/client";
import { items } from "../db/schema";
import { ulid } from "ulidx";
import type { Env } from "../types";

type Variables = { userId: string };

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

  return c.json(result);
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

  const [newItem] = await db.select().from(items).where(eq(items.id, id));
  return c.json(newItem, 201);
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
      rating: number | null;
      notes: string | null;
      position: number;
      startedAt: number | null;
      finishedAt: number | null;
    }>
  >();

  const db = createDb(c.env.DB);

  const [existing] = await db
    .select({ id: items.id })
    .from(items)
    .where(and(eq(items.id, id), eq(items.userId, userId)));

  if (!existing) return c.json({ error: "Not found" }, 404);

  // Build update object with only provided fields
  const update: Record<string, unknown> = { updatedAt: Date.now() };
  const allowed = [
    "title", "contentType", "status", "creator", "description",
    "coverUrl", "releaseDate", "rating", "notes", "position",
    "startedAt", "finishedAt",
  ] as const;
  for (const key of allowed) {
    if (key in body) update[key] = body[key];
  }

  await db
    .update(items)
    .set(update)
    .where(and(eq(items.id, id), eq(items.userId, userId)));

  const [updated] = await db.select().from(items).where(eq(items.id, id));
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
