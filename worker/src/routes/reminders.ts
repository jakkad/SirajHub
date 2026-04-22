import { Hono } from "hono";
import { and, eq } from "drizzle-orm";
import { ulid } from "ulidx";
import { createDb } from "../db/client";
import { items, reminderStates } from "../db/schema";
import { enforceLabEnabled } from "../lib/labs";
import type { Env } from "../types";

type Variables = { userId: string };

const router = new Hono<{ Bindings: Env; Variables: Variables }>();

router.use("*", async (c, next) => enforceLabEnabled(c, next, "reminders"));

const THIRTY_DAYS = 1000 * 60 * 60 * 24 * 30;
const FOURTEEN_DAYS = 1000 * 60 * 60 * 24 * 14;
const SEVEN_DAYS = 1000 * 60 * 60 * 24 * 7;

type ReminderType = "untouched_30_days" | "resume_in_progress" | "high_score_waiting";

function getReferenceTimestamp(item: typeof items.$inferSelect) {
  return item.lastTouchedAt ?? item.updatedAt ?? item.createdAt;
}

function buildReminder(item: typeof items.$inferSelect, reminderType: ReminderType, now: number) {
  const reference = getReferenceTimestamp(item);
  const ageDays = Math.max(1, Math.floor((now - reference) / (1000 * 60 * 60 * 24)));

  switch (reminderType) {
    case "resume_in_progress":
      return {
        id: `${item.id}:${reminderType}`,
        type: reminderType,
        title: "Resume this in-progress item",
        message: `You have not touched "${item.title}" in ${ageDays} days.`,
        dueAt: reference + FOURTEEN_DAYS,
        ageDays,
        item,
      };
    case "high_score_waiting":
      return {
        id: `${item.id}:${reminderType}`,
        type: reminderType,
        title: "High-score item still waiting",
        message: `"${item.title}" scored highly but has been sitting in Suggestions for ${ageDays} days.`,
        dueAt: item.createdAt + FOURTEEN_DAYS,
        ageDays,
        item,
      };
    default:
      return {
        id: `${item.id}:${reminderType}`,
        type: reminderType,
        title: "Untouched for 30 days",
        message: `"${item.title}" has not been touched in ${ageDays} days.`,
        dueAt: reference + THIRTY_DAYS,
        ageDays,
        item,
      };
  }
}

function getReminderCandidates(userItems: Array<typeof items.$inferSelect>, now: number) {
  const reminders: Array<ReturnType<typeof buildReminder>> = [];
  for (const item of userItems) {
    const reference = getReferenceTimestamp(item);

    if (item.status !== "archived" && now - reference >= THIRTY_DAYS) {
      reminders.push(buildReminder(item, "untouched_30_days", now));
    }

    if (item.status === "in_progress" && now - reference >= FOURTEEN_DAYS) {
      reminders.push(buildReminder(item, "resume_in_progress", now));
    }

    if (
      item.status === "suggestions" &&
      !item.hiddenFromRecommendations &&
      (item.cooldownUntil ?? 0) <= now &&
      (item.suggestMetricFinal ?? 0) >= 800 &&
      now - item.createdAt >= FOURTEEN_DAYS
    ) {
      reminders.push(buildReminder(item, "high_score_waiting", now));
    }
  }

  return reminders.sort((a, b) => a.dueAt - b.dueAt);
}

router.get("/", async (c) => {
  const userId = c.get("userId");
  const db = createDb(c.env.DB);
  const now = Date.now();

  const userItems = await db.select().from(items).where(eq(items.userId, userId));
  const states = await db.select().from(reminderStates).where(eq(reminderStates.userId, userId));
  const stateMap = new Map(states.map((state) => [`${state.itemId}:${state.reminderType}`, state]));

  const reminders = getReminderCandidates(userItems, now).filter((reminder) => {
    const state = stateMap.get(reminder.id);
    if (!state) return true;
    if (state.status === "dismissed") return false;
    if (state.status === "snoozed" && state.snoozedUntil && state.snoozedUntil > now) return false;
    return true;
  });

  return c.json({
    reminders: reminders.map((reminder) => ({
      id: reminder.id,
      type: reminder.type,
      title: reminder.title,
      message: reminder.message,
      dueAt: reminder.dueAt,
      ageDays: reminder.ageDays,
      item: reminder.item,
    })),
  });
});

router.patch("/:itemId/:type", async (c) => {
  const userId = c.get("userId");
  const itemId = c.req.param("itemId");
  const type = c.req.param("type") as ReminderType;
  const body = await c.req.json<{ action?: "dismiss" | "snooze" | "clear" }>();
  if (!["untouched_30_days", "resume_in_progress", "high_score_waiting"].includes(type)) {
    return c.json({ error: "Invalid reminder type" }, 400);
  }
  if (!body.action || !["dismiss", "snooze", "clear"].includes(body.action)) {
    return c.json({ error: "Invalid action" }, 400);
  }

  const db = createDb(c.env.DB);
  const [item] = await db
    .select({ id: items.id })
    .from(items)
    .where(and(eq(items.id, itemId), eq(items.userId, userId)));
  if (!item) return c.json({ error: "Item not found" }, 404);

  const [existing] = await db
    .select()
    .from(reminderStates)
    .where(and(eq(reminderStates.userId, userId), eq(reminderStates.itemId, itemId), eq(reminderStates.reminderType, type)));

  const now = Date.now();
  const next =
    body.action === "dismiss"
      ? { status: "dismissed", dismissedAt: now, snoozedUntil: null }
      : body.action === "snooze"
        ? { status: "snoozed", snoozedUntil: now + SEVEN_DAYS, dismissedAt: null }
        : { status: "active", snoozedUntil: null, dismissedAt: null };

  if (existing) {
    await db
      .update(reminderStates)
      .set({ ...next, updatedAt: now })
      .where(eq(reminderStates.id, existing.id));
  } else {
    await db.insert(reminderStates).values({
      id: ulid(),
      userId,
      itemId,
      reminderType: type,
      status: next.status,
      snoozedUntil: next.snoozedUntil,
      dismissedAt: next.dismissedAt,
      createdAt: now,
      updatedAt: now,
    });
  }

  return c.json({ ok: true });
});

export default router;
