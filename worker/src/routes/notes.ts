import { Hono } from "hono";
import { and, asc, desc, eq } from "drizzle-orm";
import { ulid } from "ulidx";
import { createDb } from "../db/client";
import { items, noteEntries } from "../db/schema";
import type { Env } from "../types";

type Variables = { userId: string };

const router = new Hono<{ Bindings: Env; Variables: Variables }>();

const VALID_ENTRY_TYPES = new Set(["highlight", "quote", "takeaway", "reflection"]);

async function ensureItemOwnership(db: ReturnType<typeof createDb>, userId: string, itemId: string) {
  const [item] = await db
    .select({ id: items.id })
    .from(items)
    .where(and(eq(items.id, itemId), eq(items.userId, userId)));
  return item ?? null;
}

router.get("/item/:itemId", async (c) => {
  const userId = c.get("userId");
  const itemId = c.req.param("itemId");
  const db = createDb(c.env.DB);

  const item = await ensureItemOwnership(db, userId, itemId);
  if (!item) return c.json({ error: "Item not found" }, 404);

  const entries = await db
    .select()
    .from(noteEntries)
    .where(and(eq(noteEntries.userId, userId), eq(noteEntries.itemId, itemId)))
    .orderBy(asc(noteEntries.position), desc(noteEntries.createdAt));

  return c.json({ entries });
});

router.post("/item/:itemId", async (c) => {
  const userId = c.get("userId");
  const itemId = c.req.param("itemId");
  const body = await c.req.json<{ entryType?: string; content?: string; context?: string }>();
  const db = createDb(c.env.DB);

  const item = await ensureItemOwnership(db, userId, itemId);
  if (!item) return c.json({ error: "Item not found" }, 404);

  const entryType = typeof body.entryType === "string" && VALID_ENTRY_TYPES.has(body.entryType) ? body.entryType : null;
  const content = body.content?.trim();
  if (!entryType) return c.json({ error: "Valid entry type is required" }, 400);
  if (!content) return c.json({ error: "Content is required" }, 400);

  const [lastEntry] = await db
    .select({ position: noteEntries.position })
    .from(noteEntries)
    .where(and(eq(noteEntries.userId, userId), eq(noteEntries.itemId, itemId)))
    .orderBy(desc(noteEntries.position))
    .limit(1);

  const now = Date.now();
  const id = ulid();
  await db.insert(noteEntries).values({
    id,
    userId,
    itemId,
    entryType,
    content,
    context: body.context?.trim() || null,
    position: (lastEntry?.position ?? -1) + 1,
    createdAt: now,
    updatedAt: now,
  });

  const [entry] = await db.select().from(noteEntries).where(eq(noteEntries.id, id));
  return c.json(entry, 201);
});

router.patch("/:id", async (c) => {
  const userId = c.get("userId");
  const id = c.req.param("id");
  const body = await c.req.json<{ entryType?: string; content?: string; context?: string | null }>();
  const db = createDb(c.env.DB);

  const [existing] = await db
    .select()
    .from(noteEntries)
    .where(and(eq(noteEntries.id, id), eq(noteEntries.userId, userId)));
  if (!existing) return c.json({ error: "Note entry not found" }, 404);

  const update: Record<string, unknown> = { updatedAt: Date.now() };
  if (typeof body.entryType === "string" && VALID_ENTRY_TYPES.has(body.entryType)) update.entryType = body.entryType;
  if (typeof body.content === "string" && body.content.trim()) update.content = body.content.trim();
  if ("context" in body) update.context = body.context?.trim() || null;

  await db.update(noteEntries).set(update).where(eq(noteEntries.id, id));
  const [entry] = await db.select().from(noteEntries).where(eq(noteEntries.id, id));
  return c.json(entry);
});

router.delete("/:id", async (c) => {
  const userId = c.get("userId");
  const id = c.req.param("id");
  const db = createDb(c.env.DB);

  const [existing] = await db
    .select({ id: noteEntries.id })
    .from(noteEntries)
    .where(and(eq(noteEntries.id, id), eq(noteEntries.userId, userId)));
  if (!existing) return c.json({ error: "Note entry not found" }, 404);

  await db.delete(noteEntries).where(eq(noteEntries.id, id));
  return c.json({ ok: true });
});

export default router;
