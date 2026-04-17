import { Hono } from "hono";
import { cors } from "hono/cors";
import { createAuth } from "./auth";
import { requireAuth } from "./middleware/auth";
import itemsRouter from "./routes/items";
import ingestRouter from "./routes/ingest";
import aiRouter from "./routes/ai";
import tagsRouter from "./routes/tags";
import userRouter from "./routes/user";
import viewsRouter from "./routes/views";
import { processAiQueue } from "./services/ai-queue";
import type { Env } from "./types";

const app = new Hono<{ Bindings: Env }>();

// CORS — allow the Vite dev server locally, and your production domain.
// Add your custom domain here once set (e.g. "https://sirajhub.yourdomain.com").
const ALLOWED_ORIGINS = [
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  // "https://sirajhub.yourdomain.com",  ← uncomment and fill in Phase 6
];

app.use(
  "/api/*",
  cors({
    origin: ALLOWED_ORIGINS,
    credentials: true,
  })
);

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
app.route("/api/items", itemsRouter);
app.route("/api/ingest", ingestRouter);
app.route("/api/ai", aiRouter);
app.route("/api/tags", tagsRouter);
app.route("/api/user", userRouter);
app.route("/api/views", viewsRouter);

export default {
  fetch: app.fetch,
  scheduled: async (_controller: ScheduledController, env: Env) => {
    await processAiQueue(env);
  },
};

// Export the app type for end-to-end type-safe Hono RPC client in apps/web
export type AppType = typeof app;
