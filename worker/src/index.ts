import { Hono } from "hono";
import { cors } from "hono/cors";
import { bodyLimit } from "hono/body-limit";
import { isTrustedOrigin, requestSecurity } from "./middleware/request-security";
import { createAuth } from "./auth";
import { requireAuth } from "./middleware/auth";
import itemsRouter from "./routes/items";
import ingestRouter from "./routes/ingest";
import aiRouter from "./routes/ai";
import tagsRouter from "./routes/tags";
import userRouter from "./routes/user";
import viewsRouter from "./routes/views";
import listsRouter from "./routes/lists";
import remindersRouter from "./routes/reminders";
import syncRouter from "./routes/sync";
import syncKeysRouter from "./routes/sync-keys";
import notesRouter from "./routes/notes";
import { processAiQueue } from "./services/ai-queue";
import type { Env } from "./types";

const app = new Hono<{ Bindings: Env }>();

app.use("/api/*", requestSecurity);
app.use("/api/*", bodyLimit({
  maxSize: 10 * 1024 * 1024,
  onError: (c) => c.json({ error: "Request exceeds the 10 MB limit" }, 413),
}));
app.use("/api/*", cors({
  origin: (origin, c) => isTrustedOrigin(origin, c.req.url) ? origin : undefined,
  credentials: true,
}));

// ── Better Auth handler ───────────────────────────────────────────────────────
// Handles all auth operations: sign-in, sign-up, sign-out, session, etc.
app.all("/api/auth/*", async (c) => {
  const auth = createAuth(c.env, c.req.raw);
  return auth.handler(c.req.raw);
});

// ── Health check ─────────────────────────────────────────────────────────────
app.get("/api/health", (c) => {
  return c.json({ ok: true, timestamp: Date.now() });
});

// ── Session middleware — all /api/* routes below this require auth ────────────
app.use("/api/*", requireAuth);

// ── API routes ────────────────────────────────────────────────────────────────
app.route("/api/sync", syncRouter);
app.route("/api/user/sync-keys", syncKeysRouter);
app.route("/api/items", itemsRouter);
app.route("/api/ingest", ingestRouter);
app.route("/api/ai", aiRouter);
app.route("/api/tags", tagsRouter);
app.route("/api/user", userRouter);
app.route("/api/views", viewsRouter);
app.route("/api/lists", listsRouter);
app.route("/api/reminders", remindersRouter);
app.route("/api/notes", notesRouter);

export default {
  fetch: app.fetch,
  scheduled: async (_controller: ScheduledController, env: Env) => {
    await processAiQueue(env);
  },
};

// Export the app type for end-to-end type-safe Hono RPC client in apps/web
export type AppType = typeof app;
