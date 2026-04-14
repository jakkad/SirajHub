import { Hono } from "hono";
import { cors } from "hono/cors";
import type { Env } from "./types";

const app = new Hono<{ Bindings: Env }>();

// Allow local Vite dev server to call the Worker API
app.use(
  "/api/*",
  cors({
    origin: ["http://localhost:5173", "http://127.0.0.1:5173"],
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
