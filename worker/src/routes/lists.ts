import { Hono } from "hono";
import { and, asc, desc, eq, sql } from "drizzle-orm";
import { ulid } from "ulidx";
import { createDb } from "../db/client";
import { items, listItems, lists } from "../db/schema";
import type { Env } from "../types";

type Variables = { userId: string };

const router = new Hono<{ Bindings: Env; Variables: Variables }>();

function normalizeListColor(value: string | null | undefined) {
  const color = value?.trim();
  return color && /^#([0-9a-fA-F]{6})$/.test(color) ? color : "#94a3b8";
}

router.get("/", async (c) => {
  const userId = c.get("userId");
  const db = createDb(c.env.DB);

  const rows = await db
    .select({
      id: lists.id,
      userId: lists.userId,
      name: lists.name,
      description: lists.description,
      color: lists.color,
      position: lists.position,
      createdAt: lists.createdAt,
      updatedAt: lists.updatedAt,
      itemCount: sql<number>`count(${listItems.itemId})`,
    })
    .from(lists)
    .leftJoin(listItems, eq(lists.id, listItems.listId))
    .where(eq(lists.userId, userId))
    .groupBy(lists.id)
    .orderBy(asc(lists.position), asc(lists.name));

  return c.json({ lists: rows });
});

router.patch("/reorder", async (c) => {
  const userId = c.get("userId");
  const body = await c.req.json<{ orderedIds?: string[] }>();
  const orderedIds = Array.isArray(body.orderedIds) ? body.orderedIds.filter((id) => typeof id === "string") : [];
  if (!orderedIds.length) return c.json({ error: "Ordered list IDs are required" }, 400);

  const db = createDb(c.env.DB);
  const userLists = await db.select({ id: lists.id }).from(lists).where(eq(lists.userId, userId));
  const validIds = new Set(userLists.map((list) => list.id));
  const filteredIds = orderedIds.filter((id) => validIds.has(id));

  for (const [index, id] of filteredIds.entries()) {
    await db.update(lists).set({ position: index, updatedAt: Date.now() }).where(and(eq(lists.id, id), eq(lists.userId, userId)));
  }

  return c.json({ ok: true });
});

router.post("/", async (c) => {
  const userId = c.get("userId");
  const body = await c.req.json<{ name?: string; description?: string; color?: string }>();
  const name = body.name?.trim();
  if (!name) return c.json({ error: "List name is required" }, 400);

  const db = createDb(c.env.DB);
  const now = Date.now();
  const [lastList] = await db
    .select({ position: lists.position })
    .from(lists)
    .where(eq(lists.userId, userId))
    .orderBy(desc(lists.position))
    .limit(1);

  const id = ulid();
  await db.insert(lists).values({
    id,
    userId,
    name,
    description: body.description?.trim() || null,
    color: normalizeListColor(body.color),
    position: (lastList?.position ?? -1) + 1,
    createdAt: now,
    updatedAt: now,
  });

  const [created] = await db.select().from(lists).where(eq(lists.id, id));
  return c.json({ ...created, itemCount: 0 }, 201);
});

router.get("/:id", async (c) => {
  const userId = c.get("userId");
  const id = c.req.param("id");
  const db = createDb(c.env.DB);

  const [list] = await db
    .select({
      id: lists.id,
      userId: lists.userId,
      name: lists.name,
      description: lists.description,
      color: lists.color,
      position: lists.position,
      createdAt: lists.createdAt,
      updatedAt: lists.updatedAt,
      itemCount: sql<number>`count(${listItems.itemId})`,
    })
    .from(lists)
    .leftJoin(listItems, eq(lists.id, listItems.listId))
    .where(and(eq(lists.id, id), eq(lists.userId, userId)))
    .groupBy(lists.id);

  if (!list) return c.json({ error: "List not found" }, 404);

  const rows = await db
    .select({
      position: listItems.position,
      addedAt: listItems.addedAt,
      item: items,
    })
    .from(listItems)
    .innerJoin(items, eq(listItems.itemId, items.id))
    .where(and(eq(listItems.listId, id), eq(items.userId, userId)))
    .orderBy(asc(listItems.position), desc(listItems.addedAt));

  return c.json({
    ...list,
    items: rows.map((row) => ({ ...row.item, listPosition: row.position, listAddedAt: row.addedAt })),
  });
});

router.patch("/:id", async (c) => {
  const userId = c.get("userId");
  const id = c.req.param("id");
  const body = await c.req.json<{ name?: string; description?: string | null; color?: string }>();
  const db = createDb(c.env.DB);

  const [existing] = await db
    .select({ id: lists.id })
    .from(lists)
    .where(and(eq(lists.id, id), eq(lists.userId, userId)));
  if (!existing) return c.json({ error: "List not found" }, 404);

  const update: Record<string, unknown> = { updatedAt: Date.now() };
  if (typeof body.name === "string" && body.name.trim()) update.name = body.name.trim();
  if ("description" in body) update.description = body.description?.trim() || null;
  if (typeof body.color === "string") update.color = normalizeListColor(body.color);

  await db.update(lists).set(update).where(eq(lists.id, id));
  const [updated] = await db.select().from(lists).where(eq(lists.id, id));
  if (!updated) return c.json({ error: "List not found after update" }, 500);

  const [countRow] = await db
    .select({ itemCount: sql<number>`count(*)` })
    .from(listItems)
    .where(eq(listItems.listId, id));

  return c.json({ ...updated, itemCount: countRow?.itemCount ?? 0 });
});

router.delete("/:id", async (c) => {
  const userId = c.get("userId");
  const id = c.req.param("id");
  const db = createDb(c.env.DB);

  const [existing] = await db
    .select({ id: lists.id })
    .from(lists)
    .where(and(eq(lists.id, id), eq(lists.userId, userId)));
  if (!existing) return c.json({ error: "List not found" }, 404);

  await db.delete(lists).where(eq(lists.id, id));
  return c.json({ ok: true });
});

router.patch("/:id/items/reorder", async (c) => {
  const userId = c.get("userId");
  const id = c.req.param("id");
  const body = await c.req.json<{ orderedItemIds?: string[] }>();
  const orderedItemIds = Array.isArray(body.orderedItemIds) ? body.orderedItemIds.filter((itemId) => typeof itemId === "string") : [];
  if (!orderedItemIds.length) return c.json({ error: "Ordered item IDs are required" }, 400);

  const db = createDb(c.env.DB);
  const [list] = await db
    .select({ id: lists.id })
    .from(lists)
    .where(and(eq(lists.id, id), eq(lists.userId, userId)));
  if (!list) return c.json({ error: "List not found" }, 404);

  const existingItems = await db
    .select({ itemId: listItems.itemId })
    .from(listItems)
    .innerJoin(items, eq(listItems.itemId, items.id))
    .where(and(eq(listItems.listId, id), eq(items.userId, userId)));
  const validItemIds = new Set(existingItems.map((entry) => entry.itemId));
  const filteredIds = orderedItemIds.filter((itemId) => validItemIds.has(itemId));

  for (const [index, itemId] of filteredIds.entries()) {
    await db.update(listItems).set({ position: index }).where(and(eq(listItems.listId, id), eq(listItems.itemId, itemId)));
  }

  return c.json({ ok: true });
});

router.get("/item/:itemId", async (c) => {
  const userId = c.get("userId");
  const itemId = c.req.param("itemId");
  const db = createDb(c.env.DB);

  const [item] = await db
    .select({ id: items.id })
    .from(items)
    .where(and(eq(items.id, itemId), eq(items.userId, userId)));
  if (!item) return c.json({ error: "Item not found" }, 404);

  const allLists = await db
    .select({
      id: lists.id,
      userId: lists.userId,
      name: lists.name,
      description: lists.description,
      color: lists.color,
      position: lists.position,
      createdAt: lists.createdAt,
      updatedAt: lists.updatedAt,
      itemCount: sql<number>`count(${listItems.itemId})`,
    })
    .from(lists)
    .leftJoin(listItems, eq(lists.id, listItems.listId))
    .where(eq(lists.userId, userId))
    .groupBy(lists.id)
    .orderBy(asc(lists.position), asc(lists.name));

  const memberships = await db
    .select({ listId: listItems.listId, addedAt: listItems.addedAt, position: listItems.position })
    .from(listItems)
    .where(eq(listItems.itemId, itemId));

  const membershipMap = new Map(memberships.map((membership) => [membership.listId, membership]));

  return c.json({
    lists: allLists.map((list) => ({
      ...list,
      containsItem: membershipMap.has(list.id),
      membership: membershipMap.get(list.id) ?? null,
    })),
  });
});

router.post("/item/:itemId", async (c) => {
  const userId = c.get("userId");
  const itemId = c.req.param("itemId");
  const body = await c.req.json<{ listId?: string }>();
  const listId = body.listId;
  if (!listId) return c.json({ error: "List ID is required" }, 400);
  const db = createDb(c.env.DB);

  const [item] = await db
    .select({ id: items.id })
    .from(items)
    .where(and(eq(items.id, itemId), eq(items.userId, userId)));
  if (!item) return c.json({ error: "Item not found" }, 404);

  const [list] = await db
    .select({ id: lists.id })
    .from(lists)
    .where(and(eq(lists.id, listId), eq(lists.userId, userId)));
  if (!list) return c.json({ error: "List not found" }, 404);

  const [existing] = await db
    .select({ listId: listItems.listId })
    .from(listItems)
    .where(and(eq(listItems.listId, listId), eq(listItems.itemId, itemId)));
  if (existing) return c.json({ ok: true, alreadyPresent: true });

  const [lastPosition] = await db
    .select({ position: listItems.position })
    .from(listItems)
    .where(eq(listItems.listId, listId))
    .orderBy(desc(listItems.position))
    .limit(1);

  await db.insert(listItems).values({
    listId,
    itemId,
    position: (lastPosition?.position ?? -1) + 1,
    addedAt: Date.now(),
  });

  return c.json({ ok: true });
});

router.delete("/item/:itemId/:listId", async (c) => {
  const userId = c.get("userId");
  const itemId = c.req.param("itemId");
  const listId = c.req.param("listId");
  const db = createDb(c.env.DB);

  const [list] = await db
    .select({ id: lists.id })
    .from(lists)
    .where(and(eq(lists.id, listId), eq(lists.userId, userId)));
  if (!list) return c.json({ error: "List not found" }, 404);

  await db.delete(listItems).where(and(eq(listItems.listId, listId), eq(listItems.itemId, itemId)));
  return c.json({ ok: true });
});

export default router;
