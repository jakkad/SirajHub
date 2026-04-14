import { Hono } from "hono";
import { cors } from "hono/cors";
import { createAuth } from "./auth";
import { requireAuth } from "./middleware/auth";
import itemsRouter from "./routes/items";
import ingestRouter from "./routes/ingest";
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
  try {
    const auth = createAuth(c.env, c.req.raw);
    return await auth.handler(c.req.raw);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const stack = err instanceof Error ? err.stack : undefined;
    console.error("[auth error]", message, stack);
    return c.json({ error: message, stack }, 500);
  }
});

// ── Session middleware — all /api/* routes below this require auth ────────────
app.use("/api/*", requireAuth);

// ── Health check ─────────────────────────────────────────────────────────────
app.get("/api/health", (c) => {
  return c.json({ ok: true, timestamp: Date.now() });
});

// ── API routes ────────────────────────────────────────────────────────────────
app.route("/api/items", itemsRouter);
app.route("/api/ingest", ingestRouter);

export default app;

// Export the app type for end-to-end type-safe Hono RPC client in apps/web
export type AppType = typeof app;
