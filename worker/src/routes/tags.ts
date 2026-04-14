import { Hono } from "hono";
import { and, eq, inArray } from "drizzle-orm";
import { createDb } from "../db/client";
import { tags, itemTags, items } from "../db/schema";
import { ulid } from "ulidx";
import type { Env } from "../types";

type Variables = { userId: string };

const router = new Hono<{ Bindings: Env; Variables: Variables }>();

// GET /api/tags — list all tags for the current user
router.get("/", async (c) => {
  const userId = c.get("userId");
  const db = createDb(c.env.DB);
  const result = await db.select().from(tags).where(eq(tags.userId, userId));
  return c.json(result);
});

// POST /api/tags — create a new tag
router.post("/", async (c) => {
  const userId = c.get("userId");
  const body = await c.req.json<{ name: string; color?: string }>();

  if (!body.name?.trim()) return c.json({ error: "name is required" }, 400);

  const db = createDb(c.env.DB);
  const id = ulid();

  await db.insert(tags).values({
    id,
    userId,
    name: body.name.trim().toLowerCase(),
    color: body.color ?? "#6366f1",
  });

  const [tag] = await db.select().from(tags).where(eq(tags.id, id));
  return c.json(tag, 201);
});

// DELETE /api/tags/:id — delete a tag (cascades to item_tags via FK)
router.delete("/:id", async (c) => {
  const userId = c.get("userId");
  const id = c.req.param("id");
  const db = createDb(c.env.DB);

  const [existing] = await db
    .select({ id: tags.id })
    .from(tags)
    .where(and(eq(tags.id, id), eq(tags.userId, userId)));

  if (!existing) return c.json({ error: "Not found" }, 404);

  await db.delete(tags).where(eq(tags.id, id));
  return c.json({ ok: true });
});

// GET /api/tags/item/:itemId — get all tags for a specific item
router.get("/item/:itemId", async (c) => {
  const userId = c.get("userId");
  const itemId = c.req.param("itemId");
  const db = createDb(c.env.DB);

  // Verify item ownership
  const [item] = await db
    .select({ id: items.id })
    .from(items)
    .where(and(eq(items.id, itemId), eq(items.userId, userId)));

  if (!item) return c.json({ error: "Not found" }, 404);

  const rows = await db
    .select({ tag: tags })
    .from(itemTags)
    .innerJoin(tags, eq(itemTags.tagId, tags.id))
    .where(eq(itemTags.itemId, itemId));

  return c.json(rows.map((r) => r.tag));
});

// POST /api/tags/item/:itemId — add a tag to an item
router.post("/item/:itemId", async (c) => {
  const userId = c.get("userId");
  const itemId = c.req.param("itemId");
  const body = await c.req.json<{ tagId: string }>();

  if (!body.tagId) return c.json({ error: "tagId is required" }, 400);

  const db = createDb(c.env.DB);

  // Verify item + tag both belong to this user
  const [item] = await db
    .select({ id: items.id })
    .from(items)
    .where(and(eq(items.id, itemId), eq(items.userId, userId)));

  if (!item) return c.json({ error: "Item not found" }, 404);

  const [tag] = await db
    .select({ id: tags.id })
    .from(tags)
    .where(and(eq(tags.id, body.tagId), eq(tags.userId, userId)));

  if (!tag) return c.json({ error: "Tag not found" }, 404);

  // Insert — ignore if already exists (idempotent)
  await db
    .insert(itemTags)
    .values({ itemId, tagId: body.tagId })
    .onConflictDoNothing();

  return c.json({ ok: true });
});

// DELETE /api/tags/item/:itemId/:tagId — remove a tag from an item
router.delete("/item/:itemId/:tagId", async (c) => {
  const userId = c.get("userId");
  const itemId = c.req.param("itemId");
  const tagId = c.req.param("tagId");
  const db = createDb(c.env.DB);

  // Verify item belongs to user
  const [item] = await db
    .select({ id: items.id })
    .from(items)
    .where(and(eq(items.id, itemId), eq(items.userId, userId)));

  if (!item) return c.json({ error: "Not found" }, 404);

  await db
    .delete(itemTags)
    .where(and(eq(itemTags.itemId, itemId), eq(itemTags.tagId, tagId)));

  return c.json({ ok: true });
});

export default router;
