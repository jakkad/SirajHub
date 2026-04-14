import { Hono } from "hono";
import { cors } from "hono/cors";
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

// ── Health check ─────────────────────────────────────────────────────────────
app.get("/api/health", (c) => {
  return c.json({ ok: true, timestamp: Date.now() });
});

// ── Future routes will be mounted here ───────────────────────────────────────
// app.route("/api/items", itemsRouter);
// app.route("/api/ingest", ingestRouter);
// app.route("/api/ai", aiRouter);
// app.route("/auth", authHandler);

export default app;

// Export the app type for end-to-end type-safe Hono RPC client in apps/web
export type AppType = typeof app;
