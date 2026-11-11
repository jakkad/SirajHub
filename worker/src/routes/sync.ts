import { Hono } from "hono";
import { and, asc, eq, gt, getTableColumns } from "drizzle-orm";
import { createDb } from "../db/client";
import { items } from "../db/schema";
import type { Env } from "../types";

const router = new Hono<{ Bindings: Env; Variables: { userId: string } }>();
const PAGE_SIZE = 100;
const { userId: _userId, ...columns } = getTableColumns(items);

router.get("/account", (c) => c.json({ accountId: c.get("userId"), protocolVersion: 1 }));

router.get("/items", async (c) => {
  const after = c.req.query("after");
  if (after !== undefined && !/^[0-9A-HJKMNP-TV-Z]{26}$/.test(after)) {
    return c.json({ error: "Invalid cursor" }, 400);
  }
  const db = createDb(c.env.DB);
  const rows = await db.select(columns).from(items)
    .where(and(eq(items.userId, c.get("userId")), after ? gt(items.id, after) : undefined))
    .orderBy(asc(items.id)).limit(PAGE_SIZE + 1);
  const page = rows.slice(0, PAGE_SIZE);
  return c.json({ items: page, next: rows.length > PAGE_SIZE ? page.at(-1)!.id : null });
});

export default router;
