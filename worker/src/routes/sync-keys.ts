import { Hono } from "hono";
import { and, desc, eq } from "drizzle-orm";
import { ulid } from "ulidx";
import { createDb } from "../db/client";
import { obsidianSyncKeys } from "../db/schema";
import { createSyncKey, digestSyncKey } from "../lib/sync-keys";
import type { Env } from "../types";

const router = new Hono<{ Bindings: Env; Variables: { userId: string } }>();

router.get("/", async (c) => {
  const db = createDb(c.env.DB);
  const keys = await db.select({ id: obsidianSyncKeys.id, createdAt: obsidianSyncKeys.createdAt })
    .from(obsidianSyncKeys).where(eq(obsidianSyncKeys.userId, c.get("userId")))
    .orderBy(desc(obsidianSyncKeys.createdAt));
  return c.json({ keys });
});

router.post("/", async (c) => {
  const db = createDb(c.env.DB);
  const key = createSyncKey();
  const id = ulid();
  const createdAt = Date.now();
  await db.insert(obsidianSyncKeys).values({
    id, userId: c.get("userId"), digest: await digestSyncKey(key), createdAt,
  });
  return c.json({ id, createdAt, key }, 201);
});

router.delete("/:id", async (c) => {
  const db = createDb(c.env.DB);
  const [revoked] = await db.delete(obsidianSyncKeys)
    .where(and(eq(obsidianSyncKeys.id, c.req.param("id")), eq(obsidianSyncKeys.userId, c.get("userId"))))
    .returning({ id: obsidianSyncKeys.id });
  return revoked ? c.json({ ok: true }) : c.json({ error: "Key not found" }, 404);
});

export default router;
