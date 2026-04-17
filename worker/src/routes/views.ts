import { Hono } from "hono";
import { and, desc, eq } from "drizzle-orm";
import { ulid } from "ulidx";
import { createDb } from "../db/client";
import { savedViews } from "../db/schema";
import type { Env } from "../types";

type Variables = { userId: string };

const VALID_SCOPES = new Set(["collection", "dashboard"]);
const VALID_CONTENT_TYPES = new Set(["book", "movie", "tv", "podcast", "youtube", "article", "tweet"]);
const VALID_STATUSES = new Set(["suggestions", "in_progress", "finished", "archived"]);

function normalizeFilters(input: unknown) {
  const record = input && typeof input === "object" ? (input as Record<string, unknown>) : {};
  const status = typeof record.status === "string" && VALID_STATUSES.has(record.status) ? record.status : undefined;
  const contentType =
    typeof record.contentType === "string" && VALID_CONTENT_TYPES.has(record.contentType) ? record.contentType : undefined;
  const minScore = typeof record.minScore === "number" && Number.isFinite(record.minScore) ? record.minScore : undefined;
  const maxDuration = typeof record.maxDuration === "number" && Number.isFinite(record.maxDuration) ? record.maxDuration : undefined;
  const onlyTrending = record.onlyTrending === true ? true : undefined;
  const query = typeof record.query === "string" && record.query.trim() ? record.query.trim() : undefined;
  return { status, contentType, minScore, maxDuration, onlyTrending, query };
}

const router = new Hono<{ Bindings: Env; Variables: Variables }>();

router.get("/", async (c) => {
  const userId = c.get("userId");
  const scope = c.req.query("scope");
  const contentType = c.req.query("content_type");
  const db = createDb(c.env.DB);

  const conditions = [eq(savedViews.userId, userId)];
  if (scope && VALID_SCOPES.has(scope)) conditions.push(eq(savedViews.scope, scope));
  if (contentType && VALID_CONTENT_TYPES.has(contentType)) conditions.push(eq(savedViews.contentType, contentType));

  const views = await db
    .select()
    .from(savedViews)
    .where(and(...conditions))
    .orderBy(desc(savedViews.updatedAt));

  return c.json({
    views: views.map((view) => ({
      ...view,
      filters: JSON.parse(view.filters),
    })),
  });
});

router.post("/", async (c) => {
  const userId = c.get("userId");
  const body = await c.req.json<{
    name: string;
    scope?: "collection" | "dashboard";
    contentType?: string | null;
    filters?: unknown;
  }>();

  const name = body.name?.trim();
  if (!name) return c.json({ error: "View name is required" }, 400);
  const scope = body.scope && VALID_SCOPES.has(body.scope) ? body.scope : "collection";
  const contentType =
    typeof body.contentType === "string" && VALID_CONTENT_TYPES.has(body.contentType) ? body.contentType : null;
  const filters = normalizeFilters(body.filters);
  const db = createDb(c.env.DB);
  const now = Date.now();
  const id = ulid();

  await db.insert(savedViews).values({
    id,
    userId,
    name,
    scope,
    contentType,
    filters: JSON.stringify(filters),
    createdAt: now,
    updatedAt: now,
  });

  const [view] = await db.select().from(savedViews).where(eq(savedViews.id, id));
  if (!view) return c.json({ error: "Saved view not found after creation" }, 500);
  return c.json({ ...view, filters: JSON.parse(view.filters) }, 201);
});

router.patch("/:id", async (c) => {
  const userId = c.get("userId");
  const id = c.req.param("id");
  const body = await c.req.json<{
    name?: string;
    filters?: unknown;
  }>();
  const db = createDb(c.env.DB);

  const [existing] = await db
    .select()
    .from(savedViews)
    .where(and(eq(savedViews.id, id), eq(savedViews.userId, userId)));
  if (!existing) return c.json({ error: "Saved view not found" }, 404);

  const update: Record<string, unknown> = { updatedAt: Date.now() };
  if (typeof body.name === "string" && body.name.trim()) update.name = body.name.trim();
  if ("filters" in body) update.filters = JSON.stringify(normalizeFilters(body.filters));

  await db.update(savedViews).set(update).where(eq(savedViews.id, id));
  const [view] = await db.select().from(savedViews).where(eq(savedViews.id, id));
  if (!view) return c.json({ error: "Saved view not found after update" }, 500);
  return c.json({ ...view, filters: JSON.parse(view.filters) });
});

router.delete("/:id", async (c) => {
  const userId = c.get("userId");
  const id = c.req.param("id");
  const db = createDb(c.env.DB);

  const [existing] = await db
    .select({ id: savedViews.id })
    .from(savedViews)
    .where(and(eq(savedViews.id, id), eq(savedViews.userId, userId)));
  if (!existing) return c.json({ error: "Saved view not found" }, 404);

  await db.delete(savedViews).where(eq(savedViews.id, id));
  return c.json({ ok: true });
});

export default router;
