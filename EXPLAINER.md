# SirajHub — Plain English Explainer

This document explains what was built in each phase, written for a junior developer.
No jargon without explanation. Updated at the end of every phase.

---

# Phase 1 — Foundation

## What Phase 1 Was About

Before writing any real features, we had to set up the "skeleton" of the project — the structure, tools, and infrastructure that everything else will be built on top of. Think of it like laying the foundation and framework of a house before adding rooms.

By the end of Phase 1 we had:
- A working project structure on your computer
- A live (but mostly empty) app deployed on the internet
- A database ready to store data
- Automatic deployment every time you push code to GitHub

---

## The Big Picture: How the Pieces Connect

```
Your Computer
    │
    │  git push
    ▼
GitHub (stores your code)
    │
    │  GitHub Actions runs automatically
    ▼
Cloudflare (hosts everything)
    ├── Worker (your API — the "backend")
    ├── Static Assets (your React app — the "frontend")
    ├── D1 Database (stores all your content items)
    └── KV Store (fast cache for sessions and metadata)
```

When someone visits your app:
1. Their browser loads the React frontend from Cloudflare's global network
2. The React app talks to the Hono Worker API to get/save data
3. The Worker reads/writes to the D1 database

---

## Part 1: The Monorepo

**What is a monorepo?**
A monorepo is one git repository that contains multiple related projects. Instead of having separate repos for "the frontend" and "the backend", everything lives together. This makes it easier to share code and keep things in sync.

**Our structure:**
```
SirajHub/              ← one git repo
├── apps/
│   └── web/           ← the React frontend (what users see in their browser)
└── worker/            ← the Hono backend (the API that stores/retrieves data)
```

**Why pnpm?**
`pnpm` is a package manager (like `npm` but faster and smarter). It handles installing all the JavaScript libraries the project needs. The `pnpm-workspace.yaml` file tells pnpm "these two folders (`apps/web` and `worker`) are separate packages, manage them together."

**Key files created:**
- `package.json` (root) — defines the workspace and shared scripts like `pnpm dev` and `pnpm build`
- `pnpm-workspace.yaml` — tells pnpm which folders are packages
- `.gitignore` — tells git which files to ignore (like `node_modules/` which can be hundreds of thousands of files)

---

## Part 2: The Worker (Backend API)

**What is a Cloudflare Worker?**
A Worker is a small piece of server-side code that runs on Cloudflare's network — not on a traditional server you rent, but on Cloudflare's computers spread around the world. It wakes up when a request comes in, does its job, and goes back to sleep. You pay nothing for personal-scale usage.

**What is Hono?**
Hono is a web framework for Workers. Instead of writing raw request/response handling, Hono lets you define routes cleanly:
```ts
app.get("/api/health", (c) => c.json({ ok: true }))
```
That one line means: "when someone visits `/api/health`, return `{ ok: true }` as JSON."

**What we built:**
- `worker/src/index.ts` — the entry point. Hono app with one test route (`GET /api/health`) that confirms the Worker is alive
- `worker/src/types.ts` — defines the `Env` type, which lists all the things the Worker has access to (D1 database, KV store, and secret API keys). TypeScript uses this to catch mistakes at build time

**How the Worker talks to its resources:**
The Worker doesn't connect to a database with a URL and password like a traditional app. Instead, Cloudflare "binds" resources directly — the database is just available as `c.env.DB` inside the code. You define these bindings in `wrangler.toml`.

---

## Part 3: The Database (Cloudflare D1)

**What is D1?**
D1 is Cloudflare's database service. Under the hood it's SQLite — a simple, fast database that stores everything in a single file. It's free for personal use (up to 5 million reads per day).

**What is Drizzle ORM?**
ORM stands for "Object Relational Mapper". Instead of writing raw SQL like:
```sql
SELECT * FROM items WHERE user_id = '123' AND status = 'in_progress'
```
Drizzle lets you write TypeScript:
```ts
db.select().from(items).where(and(eq(items.userId, '123'), eq(items.status, 'in_progress')))
```
The big benefit: TypeScript knows the shape of your data, so it catches typos and wrong column names before you run the code.

**The Schema (`worker/src/db/schema.ts`)**
The schema is the blueprint of your database — it defines every table and column. We created 7 tables:

| Table | What it stores |
|---|---|
| `user` | Your account (email, name, AI taste preferences) |
| `session` | Login sessions (so you stay logged in) |
| `items` | Every book/movie/show/etc. you track |
| `tags` | Labels you can attach to items (e.g. "sci-fi", "must-read") |
| `item_tags` | Links items to their tags (one item can have many tags) |
| `ai_cache` | Saved AI analysis results (so you don't call Gemini twice for the same item) |
| `url_cache` | Saved metadata from external APIs (so you don't re-fetch the same URL) |

**What is a migration?**
A migration is a SQL file that describes a change to the database structure. Instead of manually editing the database, you write a migration file and run it. This means:
- You can track database changes in git history
- You can apply the same changes to local dev, staging, and production
- You can roll back if something goes wrong

We ran `drizzle-kit generate` which read our schema and automatically wrote the SQL migration file. Then `wrangler d1 migrations apply` ran that SQL against the database.

---

## Part 4: The React Frontend

**What is React?**
React is a JavaScript library for building user interfaces. You write components (reusable pieces of UI) and React figures out how to efficiently update the browser when data changes.

**What is Vite?**
Vite is the build tool. It takes your TypeScript/React source files and bundles them into plain HTML, CSS, and JavaScript that browsers can understand. During development it runs a local server with hot reload (changes appear in the browser instantly without a page refresh).

**What is TanStack Router?**
It handles navigation within the app (moving between pages without full browser reloads). It uses "file-based routing" — if you create `src/routes/settings.tsx`, it automatically becomes the `/settings` page. No manual route configuration needed.

**What is TanStack Query?**
It manages fetching data from the API. Instead of writing fetch + loading state + error state every time, you write:
```ts
const { data, isLoading } = useQuery({ queryKey: ['items'], queryFn: fetchItems })
```
It handles caching, background refetching, and keeping the UI in sync automatically.

**What is Tailwind CSS v4?**
Tailwind is a CSS framework. Instead of writing separate CSS files, you add classes directly to HTML elements: `className="flex items-center gap-4 text-sm"`. v4 is the newest version — it uses CSS custom properties (`--color-background: oklch(...)`) which makes theme switching and dark mode much cleaner.

**OKLCH Colors**
OKLCH is a modern color format that's more "perceptually uniform" than the old hex codes. `oklch(65% 0.18 260)` means: 65% lightness, 0.18 chroma (saturation), 260 degrees hue (indigo/violet). Colors defined this way look more consistent across different screens.

**The `@cloudflare/vite-plugin`**
This is the glue between the frontend and the Worker during development. When you run `pnpm dev`, this plugin starts both the Vite dev server (for the React app) and the Worker (for the API) together. API calls from the React app are automatically forwarded to the Worker — no separate terminal windows needed.

**Key files created:**
- `apps/web/vite.config.ts` — configures Vite and its plugins
- `apps/web/index.html` — the single HTML file the browser loads (React takes over from there)
- `apps/web/src/main.tsx` — the entry point; sets up the router and query client, mounts React to the page
- `apps/web/src/index.css` — imports Tailwind and defines the OKLCH color tokens for the dark theme
- `apps/web/src/routes/__root.tsx` — the persistent layout (the top navigation bar that stays across all pages)
- `apps/web/src/routes/index.tsx` — the home page, shows content type cards and the status board preview, and pings `/api/health` to confirm the Worker is reachable

---

## Part 5: The `wrangler.toml` Config File

This is the most important config file in the project. It tells Cloudflare everything it needs to know to deploy the app:

```toml
name = "sirajhub"               ← the name of your Worker on Cloudflare
main = "worker/src/index.ts"    ← where the Worker code lives
compatibility_date = "2025-01-01"

[assets]
directory = "./apps/web/dist"   ← where the built React app lives
not_found_handling = "single-page-application"  ← send all unknown URLs to index.html (needed for SPA routing)

[[d1_databases]]
binding = "DB"                  ← in code, access this as c.env.DB
database_name = "sirajhub-db"
database_id = "1107d722-..."    ← the real database ID on Cloudflare

[[kv_namespaces]]
binding = "SIRAJHUB_KV"         ← in code, access this as c.env.SIRAJHUB_KV
id = "16d6f5ce-..."             ← the real KV namespace ID on Cloudflare
```

The `not_found_handling = "single-page-application"` line is critical. When a user navigates directly to `/settings`, Cloudflare would normally return a 404 (no file called `settings` exists). This setting tells Cloudflare to always return `index.html` instead, and let React Router handle the URL.

---

## Part 6: Cloudflare Setup

Before deploying, two resources were created on Cloudflare:

**D1 Database**
```
npx wrangler d1 create sirajhub-db
```
This created an actual database on Cloudflare's infrastructure and gave back a unique ID (`1107d722-cbe2-4ab8-a031-0da570e4bc8b`). That ID was pasted into `wrangler.toml` so the Worker knows which database to connect to.

**KV Namespace**
```
npx wrangler kv namespace create SIRAJHUB_KV
```
KV (Key-Value) is like a fast dictionary in the cloud. You store a key (`"session:abc123"`) and retrieve its value later. We'll use it for storing login sessions (Phase 2) and caching metadata from external APIs (Phase 4). The ID returned was also pasted into `wrangler.toml`.

---

## Part 7: GitHub Actions (Automated Deployment)

**What is GitHub Actions?**
It's a system that automatically runs tasks when certain things happen in your GitHub repo. We configured it to run every time you push to the `main` branch.

**The workflow file (`.github/workflows/deploy.yml`)**
This file defines the steps that run in sequence on a GitHub-managed computer:

```
1. Check out the code (download it to the CI machine)
2. Install pnpm
3. Install Node.js 24
4. pnpm install --frozen-lockfile  ← install all dependencies
5. pnpm build                      ← build the React app into static files
6. pnpm exec wrangler deploy       ← upload the Worker + static files to Cloudflare
7. wrangler d1 migrations apply --remote  ← apply any new DB migrations to production
```

**Secrets**
The deploy step needs to authenticate with Cloudflare. We can't put the API token directly in the file (it would be visible to anyone on GitHub). Instead, we added two **repository secrets** in GitHub:
- `CF_API_TOKEN` — a Cloudflare API token with permission to deploy Workers and manage D1
- `CF_ACCOUNT_ID` — your Cloudflare account identifier

These are encrypted by GitHub and injected as environment variables during the workflow run. The workflow file references them as `${{ secrets.CF_API_TOKEN }}` — GitHub replaces this with the real value at runtime, but never shows it in logs.

**Why `--frozen-lockfile`?**
The `pnpm-lock.yaml` file records the exact version of every dependency. `--frozen-lockfile` tells pnpm "don't update anything, install exactly what the lockfile says." This ensures the CI build uses the same versions as your local machine — no surprises from a package updating between runs.

---

## Phase 1 Summary

| What | How | Why |
|---|---|---|
| Code structure | pnpm monorepo | Keep frontend and backend together in one repo |
| Backend | Hono on Cloudflare Workers | Free, fast, globally distributed API |
| Database | Cloudflare D1 (SQLite) | Free, integrated with Workers, no server to manage |
| Cache | Cloudflare KV | Fast key-value store for sessions and metadata |
| Frontend | React 19 + Vite + TanStack Router | Modern SPA with file-based routing |
| Styles | Tailwind v4 + OKLCH tokens | Dark-mode-first, maintainable design system |
| Deployment | GitHub Actions → Wrangler | Every push to `main` auto-deploys |

---

---

# Phase 2 — Authentication

## What Phase 2 Was About

Before Phase 2, anyone who knew the URL could see the app. Phase 2 adds a login wall — the entire app is locked behind a username/password, and your session persists across browser refreshes until you log out.

By the end of Phase 2 we had:
- A `/login` page that handles both sign-up and sign-in
- A session cookie that keeps you logged in
- Automatic redirect to `/login` for any unauthenticated visit
- A logout button in the top-right nav

---

## The Big Picture: How Auth Works

```
Browser                    Cloudflare Worker
   │                              │
   │  POST /api/auth/sign-up/email│
   │  { email, password, name }   │
   │─────────────────────────────▶│
   │                              │  1. Hash the password (bcrypt)
   │                              │  2. INSERT INTO user ...
   │                              │  3. INSERT INTO account (password hash) ...
   │                              │  4. INSERT INTO session ...
   │◀─────────────────────────────│
   │  Set-Cookie: better-auth.session=...
   │
   │  (Every subsequent request carries that cookie)
   │
   │  GET /api/health             │
   │  Cookie: better-auth.session=│
   │─────────────────────────────▶│
   │                              │  1. Look up session in D1
   │                              │  2. Valid → inject userId, continue
   │◀─────────────────────────────│
   │  200 { ok: true }            │
```

---

## Part 1: Better Auth

**What is Better Auth?**
Better Auth is an open-source authentication library. Instead of building user login from scratch (which is surprisingly easy to get wrong — password hashing, token generation, session expiry, CSRF protection), Better Auth handles all of it. We just configure it and plug it in.

**Why not a hosted service like Clerk or Auth0?**
Those services add a third-party dependency and cost money at scale. Better Auth is self-hosted — it runs inside our own Cloudflare Worker and stores data in our own D1 database. We own everything.

**New database tables (added in `0001_stale_ogun.sql`)**

| Table | What it stores |
|---|---|
| `account` | One row per auth method per user. For email/password, it stores the hashed password. Later you could add Google login and get a second row. |
| `verification` | Temporary tokens for actions like "verify your email" or "reset password". Not used yet (email verification is disabled), but Better Auth needs the table to exist. |

---

## Part 2: The Auth Factory (`worker/src/auth.ts`)

In a traditional Node.js server you'd create your auth instance once at startup. In Cloudflare Workers, there is no "startup" — the worker wakes up fresh for each request. So the auth instance is created per-request inside a factory function:

```ts
export function createAuth(env: Env) {
  const db = createDb(env.DB);   // env.DB is only available per-request
  return betterAuth({
    secret: env.AUTH_SECRET,     // used to sign session tokens
    database: drizzleAdapter(db, { provider: "sqlite", schema: { ... } }),
    emailAndPassword: { enabled: true, requireEmailVerification: false },
  });
}
```

The `drizzleAdapter` tells Better Auth "use these specific Drizzle table objects to read and write user/session data". Better Auth never writes raw SQL — it goes through Drizzle, which handles the D1 async API.

---

## Part 3: The Session Middleware (`worker/src/middleware/auth.ts`)

Every API route except `/api/auth/*` is now protected by this middleware:

```ts
export const requireAuth = createMiddleware(async (c, next) => {
  const auth = createAuth(c.env);
  const session = await auth.api.getSession({ headers: c.req.raw.headers });
  if (!session) return c.json({ error: "Unauthorized" }, 401);
  c.set("userId", session.user.id);
  await next();
});
```

**What this does line by line:**
1. Create the auth instance (reads the D1 binding from `c.env`)
2. Ask Better Auth "is there a valid session cookie in these request headers?"
3. If not → return 401 immediately, don't touch the actual route handler
4. If yes → store the user's ID in Hono's context (`c.set`) so any route handler can access it as `c.get("userId")`
5. Call `next()` to continue to the actual route handler

**The ordering trick in `index.ts`:**

```ts
app.all("/api/auth/*", handler);  // ← registered first: handles auth routes before middleware
app.use("/api/*",  requireAuth);  // ← registered second: only runs if no earlier handler matched
app.get("/api/health", ...);      // ← protected
```

Hono executes handlers in registration order. Because the auth handler is registered first, requests to `/api/auth/*` are handled and returned before `requireAuth` ever runs. This means sign-in and sign-up are publicly accessible, everything else requires a session.

---

## Part 4: The Login Page (`apps/web/src/routes/login.tsx`)

The login page has two modes: **sign in** and **create account**, with a toggle link between them. Both share the same form component.

**Route guard in `__root.tsx`:**

```ts
beforeLoad: async ({ location }) => {
  if (location.pathname === "/login") return;          // login page is always public
  const { data: session } = await authClient.getSession();
  if (!session) throw redirect({ to: "/login" });      // not logged in → redirect
  return { user: session.user };                       // pass user to child routes
}
```

`beforeLoad` is TanStack Router's hook that runs before a route renders. If it throws a `redirect(...)`, the router navigates there instead of rendering the page. This runs on every navigation, so you can never "sneak past" the login by typing a URL directly.

**The Better Auth client (`apps/web/src/lib/auth-client.ts`):**

```ts
export const authClient = createAuthClient();
```

`createAuthClient()` with no arguments auto-detects the base URL from the current browser location and uses `/api/auth` as the base path. So when you call `authClient.signIn.email(...)`, it makes a `POST` to `/api/auth/sign-in/email` on the same origin.

---

## Part 5: The D1 State Directory Gotcha

During development, there are two processes involved:
- `wrangler d1 migrations apply --local` — applies migrations from the **project root** terminal
- `@cloudflare/vite-plugin` — runs Miniflare (the local Cloudflare emulator) from the **`apps/web/`** directory

Each process stores its D1 database in a `.wrangler/state/v3/d1/` folder **relative to where it runs**. So migrations applied from the project root land in `/SirajHub/.wrangler/state/` but the Vite plugin looks in `/SirajHub/apps/web/.wrangler/state/` — a completely different file.

The fix: always run local migrations with:
```
pnpm db:migrate:local
```
which is wired to: `wrangler d1 migrations apply sirajhub-db --local --persist-to ./apps/web/.wrangler/state`

This targets the same SQLite file that the Vite dev server reads from.

---

## Phase 2 Summary

| What | How | Why |
|---|---|---|
| Auth library | Better Auth | Self-hosted, open-source, handles session security correctly |
| Session storage | Cloudflare D1 | Same database as everything else, no extra service |
| Password storage | `account` table (hashed) | Better Auth hashes with scrypt — never stores plaintext |
| Auth handler mount | `/api/auth/*` | Better Auth's default base path — client and server agree automatically |
| Route protection | Hono middleware | One central place to enforce auth — no per-route boilerplate |
| Login UI | TanStack Router `beforeLoad` | Runs before render, so unauthenticated users never see a flash of protected content |

---

---

---

# Phase 3 — Core CRUD

## What Phase 3 Was About

Phase 3 is where the app becomes usable. We built the ability to manually add items (books, movies, shows, etc.), see them on a Kanban board organised by status, and drag cards between columns to update their status. Every change persists to D1.

By the end of Phase 3 we had:
- A full items API (create, read, update, delete)
- A Kanban board with four columns: Suggestions / In Progress / Finished / Archived
- Drag-and-drop between columns
- A modal dialog for adding items manually
- A shared constants + typed API client layer on the frontend

---

## The Big Picture: Data Flow for an Item

```
User fills out Add Item dialog
    │
    │  POST /api/items  { title, contentType, status, ... }
    ▼
Hono Worker
    │  requireAuth middleware: confirm session cookie is valid
    │  createDb(env.DB): get a Drizzle connection
    │  db.insert(items).values({ id: ulid(), userId, ... })
    ▼
Cloudflare D1 (SQLite)
    │  Row written to `items` table
    ▼
Worker returns the new row as JSON (201 Created)
    │
    ▼
TanStack Query invalidates the "items" cache
    │
    ▼
useItems() re-fetches → BoardView re-renders with the new card
```

---

## Part 1: The Items API (`worker/src/routes/items.ts`)

The items router is a self-contained Hono sub-app that gets mounted at `/api/items` in `index.ts`.

**Why a sub-app instead of inline routes?**
As the Worker grows it would get unwieldy to define every route in `index.ts`. Hono lets you create a small `new Hono()` in a separate file and mount it at a path prefix with `app.route(...)`. The sub-app doesn't know or care what prefix it's mounted at — it just defines `GET /`, `POST /`, `PATCH /:id`, `DELETE /:id`.

**The four routes:**

| Method | Path | What it does |
|---|---|---|
| `GET /api/items` | list | Returns all items for the logged-in user, optionally filtered by `?status=` or `?content_type=` |
| `POST /api/items` | create | Inserts a new item row; generates a ULID for the id, sets `createdAt`/`updatedAt` to `Date.now()` |
| `PATCH /api/items/:id` | update | Updates any subset of fields; verifies the item belongs to the current user before touching it |
| `DELETE /api/items/:id` | delete | Hard-deletes the row after verifying ownership |

**What is a ULID?**
A ULID (Universally Unique Lexicographically Sortable Identifier) is like a UUID but it encodes a timestamp in the first part. That means items sort chronologically when sorted by ID, which is useful for ordering. Example: `01JQVHZ3B4KRNM2P5QGWXY8D7F`.

**Security: user scoping**
Every query that touches an item includes `eq(items.userId, userId)` in its WHERE clause. This means a user can never read, update, or delete another user's items — even if they somehow know the item's ID. The `userId` always comes from the session (injected by the auth middleware), never from the request body.

**The update field allowlist:**
Rather than passing the raw request body directly to Drizzle's `update().set()`, the PATCH handler explicitly loops over an allowlist of column names and only includes them in the update. This prevents a crafty client from trying to overwrite fields like `userId` or `createdAt`.

---

## Part 2: Shared Constants and Typed API Layer

**`apps/web/src/lib/constants.ts`**
The list of content types (book, movie, tv, etc.) and statuses (suggestions, in_progress, finished, archived) were previously defined inline in `routes/index.tsx`. They're now extracted to a central constants file so `BoardView`, `ItemCard`, `AddItemDialog`, and any future component all reference the same source of truth.

```ts
export const CONTENT_TYPES = [
  { id: "book", label: "Book", color: "var(--color-book)", icon: "📚" },
  // ...
] as const;
```

The `as const` tells TypeScript to infer the exact string literals (e.g. `"book"`) rather than the wider `string` type. This makes `ContentTypeId = typeof CONTENT_TYPES[number]["id"]` a union type `"book" | "movie" | "tv" | ...` that TypeScript enforces everywhere.

**`apps/web/src/lib/api.ts`**
This file defines:
1. The `Item` interface — the shape of a row from the `items` table, typed on the frontend
2. The `itemsApi` object — thin wrappers around `fetch` for each CRUD operation

The `request<T>()` helper that powers all four functions:
- Always sends `Content-Type: application/json` and `credentials: "include"` (so the session cookie is sent)
- On non-OK responses, parses the JSON error message and throws it as an `Error` — this lets TanStack Query and the UI display meaningful error messages

**`apps/web/src/hooks/useItems.ts`**
Four TanStack Query hooks that the UI components import. Each mutation hook (`useCreateItem`, `useUpdateItem`, `useDeleteItem`) calls `qc.invalidateQueries({ queryKey: ["items"] })` on success, which tells TanStack Query to re-fetch the items list. This is the standard TanStack Query pattern for keeping the UI in sync after a mutation.

---

## Part 3: The Board View (`apps/web/src/components/BoardView.tsx`)

The board is a four-column Kanban layout. Items are fetched once with `useItems()`, then grouped into columns with `useMemo()`:

```ts
const byStatus = useMemo(() => {
  const map = { suggestions: [], in_progress: [], finished: [], archived: [] };
  for (const item of items) map[item.status].push(item);
  // sort each column by position then createdAt
  return map;
}, [items]);
```

`useMemo` re-runs this grouping only when `items` changes — not on every render. For large lists this is a meaningful optimisation.

**Drag and drop with @dnd-kit**

`@dnd-kit` is the drag-and-drop library. It has three packages at play here:

| Package | What it provides |
|---|---|
| `@dnd-kit/core` | `DndContext`, `useDraggable`, `useDroppable`, `DragOverlay`, sensor system |
| `@dnd-kit/sortable` | Installed and available for within-column reordering (Phase 6) |
| `@dnd-kit/utilities` | CSS transform helpers |

The interaction model:

1. **`DndContext`** wraps the entire board. It orchestrates all drag events.
2. **`PointerSensor`** with `activationConstraint: { distance: 6 }` — the drag doesn't activate until the pointer has moved 6px. Without this, clicking a button inside a card would briefly trigger a drag.
3. **`useDroppable({ id: statusId })`** on each column — the column registers itself as a valid drop target. `isOver` becomes `true` while a card is being held over that column, enabling the highlight.
4. **`useDraggable({ id: item.id })`** on each card — spreads `listeners` (pointer event handlers) and `attributes` (ARIA attributes) onto the wrapper div. `isDragging` is `true` for the original card while it's being dragged.
5. **`DragOverlay`** renders a "ghost" copy of the dragged card that follows the pointer. The original card turns invisible (`opacity: 0`) while dragging, creating the effect of a card "lifting off" and floating to its destination.

**The `onDragEnd` handler:**
```ts
function handleDragEnd({ active, over }) {
  if (!over) return;                         // dropped outside any column
  const sourceColumn = findItemColumn(active.id);
  const destColumn = STATUS_IDS.has(over.id)
    ? over.id                                // dropped on an empty column area
    : findItemColumn(over.id);               // dropped on another card → find its column
  if (sourceColumn !== destColumn) {
    updateItem({ id: active.id, status: destColumn });
  }
}
```

`over.id` is the ID of whatever droppable element the card was released over. If it's a column ID (one of the four status strings) the card was dropped directly on the column background. If it's a card ID, we look up which column that card is in. Either way we end up with the destination column and call the PATCH mutation.

---

## Part 4: The Item Card (`apps/web/src/components/ItemCard.tsx`)

Each card displays: cover image (or a large emoji icon if no URL), title, creator, a colored content-type badge, and an optional star rating.

**The 3-dot menu:**
A small `···` button in the top-right corner reveals a dropdown with "Archive" and "Delete". Building this without a component library required two things:
1. A fixed-position invisible overlay div behind the menu — clicking it closes the menu (the "click outside to close" pattern)
2. A `onPointerDown: e.stopPropagation()` on both the `···` button and all menu buttons — @dnd-kit activates drag on `pointerdown`, so without stopping propagation, clicking the menu would start a drag instead

---

## Part 5: The Add Item Dialog (`apps/web/src/components/AddItemDialog.tsx`)

A controlled modal dialog built with a fixed-position overlay div. The form state is managed with a single `useState` object reset back to defaults when the dialog closes.

**Where the dialog lives:**
The dialog and its open/close state live in `__root.tsx` (the persistent layout), not inside `index.tsx`. This means the "+ Add Item" button can live in the nav bar and the dialog works from any page, not just the board view.

**Form submit flow:**
1. `handleSubmit` calls `createItem(formData, { onSuccess: () => { resetForm(); onClose(); } })`
2. The `onSuccess` callback fires only after the Worker responds with 201
3. `useCreateItem` internally calls `qc.invalidateQueries({ queryKey: ["items"] })` on success
4. TanStack Query re-fetches → the new card appears on the board automatically

---

## Phase 3 Summary

| What | How | Why |
|---|---|---|
| Items API | Hono sub-router mounted at `/api/items` | Keeps route files small and focused |
| IDs | ULIDs from `ulidx` | Sortable by creation time, no DB auto-increment needed |
| User scoping | `eq(items.userId, userId)` on every query | Prevents users from touching each other's data |
| Typed frontend | `Item` interface in `api.ts` | One source of truth for the item shape across all components |
| Shared constants | `lib/constants.ts` | Content types and statuses defined once, used everywhere |
| Data fetching | TanStack Query + `itemsApi` helpers | Caching, invalidation, and loading states handled automatically |
| Board layout | CSS grid, 4 equal columns | Simple and responsive without a layout library |
| Drag and drop | `@dnd-kit/core` | Accessible, pointer-based drag with no Flash-of-Unstyled-Drag |
| Drag overlay | `DragOverlay` component | Card appears to "lift" during drag rather than stretch in place |
| Add item dialog | Controlled form in `__root.tsx` | Global nav button works from any page |

---

---

---

# Phase 4 — Ingest Pipeline

## What Phase 4 Was About

Before Phase 4, adding an item meant typing every field by hand. Phase 4 makes that a fallback. Now you paste a URL (or type a title) and the app fetches the metadata automatically — title, cover image, creator, description, release date — from the relevant external service. Results are cached in the database so the same URL never gets re-fetched within 24 hours.

By the end of Phase 4 we had:
- A `POST /api/ingest` endpoint that accepts a URL or a search query
- Six metadata fetchers: YouTube, TMDB (movies + TV), Open Library / Google Books, iTunes / Podcast Index, Cloudflare HTMLRewriter article scraper, Twitter oEmbed
- All fetchers returning the same normalised shape
- 24-hour result caching in the `url_cache` D1 table
- An updated Add Item dialog with "Paste URL", "Search by name", and "Manual" modes

---

## The Big Picture: The Ingest Pipeline

```
Dialog: user pastes  https://www.youtube.com/watch?v=abc123
                         │
                         │  POST /api/ingest  { url: "..." }
                         ▼
               worker/src/routes/ingest.ts
                         │
                         │  1. Check url_cache — was this URL fetched < 24h ago?
                         │     YES → return cached metadata immediately
                         │     NO  → continue
                         │
                         │  2. dispatch(url, env)
                         ▼
             worker/src/services/metadata/index.ts
             detectFromUrl("youtube.com/watch") → "youtube"
                         │
                         │  fetchYouTube(url, env)
                         ▼
             YouTube Data API v3
             videos.list?part=snippet,contentDetails&id=abc123
                         │
                         │  { title, channelTitle, thumbnail, duration, ... }
                         ▼
             Normalised FetchedMetadata
             { title, contentType: "youtube", creator, coverUrl, ... }
                         │
                         │  3. INSERT OR REPLACE INTO url_cache
                         │
                         │  4. Return metadata as JSON
                         ▼
             Dialog pre-populates all form fields
             User edits if needed, clicks "Add Item"
             → POST /api/items → card appears on board
```

---

## Part 1: The Normalised Metadata Shape

Every fetcher returns the same interface regardless of source:

```ts
interface FetchedMetadata {
  title: string;
  contentType: "book" | "movie" | "tv" | "podcast" | "youtube" | "article" | "tweet";
  creator?: string;        // author / director / channel / artist
  description?: string;
  coverUrl?: string;       // book cover / movie poster / video thumbnail
  releaseDate?: string;    // YYYY-MM-DD or YYYY
  durationMins?: number;   // runtime for movies/videos
  sourceUrl?: string;      // canonical URL for the item
  externalId?: string;     // TMDB ID / YouTube video ID / iTunes collection ID
  metadata?: string;       // JSON blob for type-specific extras (genres, ISBN, etc.)
}
```

The `metadata` field is a JSON string because D1/SQLite doesn't have a native JSON column type. It stores type-specific extras (e.g. TMDB genres, iTunes feed URL) that don't warrant their own columns.

---

## Part 2: URL Detection (`services/metadata/index.ts`)

The dispatcher uses simple regex patterns to figure out which fetcher to call:

```ts
function detectFromUrl(url: string): ContentType {
  if (/youtube\.com\/watch|youtu\.be\//.test(url))    return "youtube";
  if (/themoviedb\.org\/movie\//.test(url))            return "movie";
  if (/themoviedb\.org\/tv\//.test(url))               return "tv";
  if (/twitter\.com\/.+\/status\/|x\.com\/.+\/status\//.test(url)) return "tweet";
  if (/goodreads\.com|openlibrary\.org/.test(url))     return "book";
  if (/podcasts\.apple\.com|anchor\.fm/.test(url))     return "podcast";
  return "article"; // default — try to scrape OG tags
}
```

The fallback to `"article"` means any URL that doesn't match a known pattern gets run through the article scraper. Most pages have OG meta tags now, so this works well for blog posts, news articles, and documentation pages.

For search-by-name requests (no URL), the caller must provide `content_type` so the dispatcher knows which API to query.

---

## Part 3: The Fetchers

### YouTube (`youtube.ts`)

Extracts the video ID from three URL patterns (`?v=`, `youtu.be/`, `/embed/`) then calls:

```
GET https://www.googleapis.com/youtube/v3/videos
    ?part=snippet,contentDetails
    &id=VIDEO_ID
    &key=YOUTUBE_API_KEY
```

YouTube returns video duration in **ISO 8601 format**: `PT1H23M45S` (1 hour, 23 minutes, 45 seconds). A small parser converts this to minutes:
```ts
function parseDuration(iso: string): number {
  const m = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  return parseInt(m?.[1] ?? "0") * 60 + parseInt(m?.[2] ?? "0");
}
```

### TMDB — Movies and TV (`movies.ts`)

Handles two input shapes:
1. **TMDB URL** (e.g. `themoviedb.org/movie/157336-interstellar`) — extract the numeric ID and media type directly from the URL
2. **Title string** — call the search endpoint, take the first result, then fetch its detail page

The poster path from TMDB is a relative path like `/abc123.jpg`. The full URL is constructed with a base: `https://image.tmdb.org/t/p/w500` + the path.

### Books (`books.ts`)

Two-tier lookup:

1. **Open Library** (no API key needed) — searches `openlibrary.org/search.json`, constructs cover URL from `cover_i` field: `https://covers.openlibrary.org/b/id/{cover_i}-L.jpg`
2. **Google Books API** (fallback) — richer metadata including description, page count, categories

### Podcasts (`podcasts.ts`)

Two-tier lookup:

1. **iTunes Search API** (no auth, simple JSON) — fast and reliable for well-known podcasts
2. **Podcast Index** (fallback) — requires a SHA-1 auth header

The Podcast Index uses an unusual auth scheme: instead of HMAC, they want a plain SHA-1 of the concatenated string `apiKey + apiSecret + unixTimestamp`. Cloudflare Workers have the Web Crypto API built in, so no external crypto library is needed:

```ts
async function sha1Hex(input: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-1", new TextEncoder().encode(input));
  return Array.from(new Uint8Array(buf))
    .map(b => b.toString(16).padStart(2, "0"))
    .join("");
}
```

`crypto.subtle.digest` is asynchronous (returns a Promise). The `padStart(2, "0")` ensures each byte is always two hex characters (e.g. `0a` not just `a`).

### Articles (`articles.ts`)

The article scraper uses **Cloudflare HTMLRewriter** — a streaming HTML parser built directly into the Workers runtime. Unlike loading the entire HTML into memory and using regex, `HTMLRewriter` processes the response as it streams in, firing callbacks when it encounters matching elements:

```ts
const rewriter = new HTMLRewriter()
  .on('meta[property="og:title"]', {
    element(el) { ogTitle = el.getAttribute("content") ?? ""; },
  })
  .on('meta[property="og:description"]', {
    element(el) { ogDesc = el.getAttribute("content") ?? ""; },
  })
  // ... more selectors
```

`HTMLRewriter` uses CSS selectors just like `document.querySelector` in the browser. This approach is memory-efficient, fast, and works correctly even on very large pages.

### Tweets (`tweets.ts`)

The simplest fetcher. Twitter/X provides an **oEmbed** API endpoint that returns ready-made embed HTML for any tweet URL:

```
GET https://publish.twitter.com/oembed?url=TWEET_URL&omit_script=true
```

The response includes `html` (the full embed HTML with links, blockquote, etc.) and `author_name`. We strip HTML tags with a simple regex to produce a plain-text description, and try to extract the date from the embed HTML for `releaseDate`.

---

## Part 4: Caching (`routes/ingest.ts`)

Every URL-based request is checked against the `url_cache` table before hitting any external API:

```ts
const [cached] = await db.select().from(urlCache).where(eq(urlCache.url, url));
if (cached && Date.now() - cached.fetchedAt < 24 * 60 * 60 * 1000) {
  return c.json(JSON.parse(cached.metadata));
}
```

After a fresh fetch, the result is upserted (inserted or replaced if the URL already exists) using Drizzle's `.onConflictDoUpdate()`:

```ts
await db.insert(urlCache).values({ url, metadata, fetchedAt, source })
  .onConflictDoUpdate({ target: urlCache.url, set: { metadata, fetchedAt, source } });
```

This means the second time you add the same YouTube video, the API response comes back instantly from the local D1 database with no external network call.

---

## Part 5: The Updated Add Item Dialog

The dialog now has three modes:

1. **Paste URL** — type or paste any URL, hit "Fetch". The app auto-detects the content type and calls `POST /api/ingest`. On success, all form fields are pre-populated and the cover image appears as a preview.

2. **Search by name** — pick a content type (book, movie, TV, podcast), type a title, hit "Search". This also calls `POST /api/ingest` with `query` + `content_type` instead of a URL.

3. **Manual** — hides the fetch section entirely and shows a blank form (same as Phase 3).

The state machine is simple: `mode` is `"url" | "search" | "manual"`. When a fetch succeeds, the returned `FetchedMetadata` is mapped directly onto the `form` state object. The user can then edit any field before clicking "Add Item".

---

## Phase 4 Summary

| What | How | Why |
|---|---|---|
| Ingest route | `POST /api/ingest` in a Hono sub-router | Keeps all fetching logic server-side (API keys never exposed to client) |
| URL detection | Regex pattern matching | Simple, fast, zero dependencies |
| YouTube | YouTube Data API v3 | Official, rich metadata including duration |
| Movies/TV | TMDB API | Comprehensive metadata, high-quality posters |
| Books | Open Library (primary) → Google Books (fallback) | Open Library has no rate limits; Google Books covers more obscure titles |
| Podcasts | iTunes Search (primary) → Podcast Index (fallback) | iTunes covers the mainstream; Podcast Index has a broader catalogue |
| Articles | Cloudflare HTMLRewriter | Streaming HTML parser built into Workers; handles large pages efficiently |
| Tweets | Twitter oEmbed API | Free, no auth, officially supported |
| Caching | `url_cache` D1 table, 24h TTL | Avoids redundant API calls; stays within free-tier rate limits |
| Auth for Podcast Index | SHA-1 via `crypto.subtle` (Web Crypto API) | No external crypto library needed in Workers |
| Dialog URL mode | Three-mode UI (`url` / `search` / `manual`) | Fetch is opt-in; manual mode always available as fallback |

---

---

---

---

# Phase 5 — AI Features

## What Phase 5 Was About

Phase 5 adds three AI-powered capabilities on top of the existing app: on-demand analysis of any item (summary, key points, recommendation), a "Next to Consume" feature that ranks your Suggestions list best-first, and a utility that can automatically categorise an item from its title and description. All AI calls go to Google's Gemini API, which has a free tier of 1,000 requests per day — far more than a personal tracker will ever use.

By the end of Phase 5 we had:
- A `POST /api/ai/analyze/:id` endpoint that generates a rich summary for any item and caches it for 7 days
- A `GET /api/ai/next` endpoint that asks Gemini to rank your Suggestions and caches the result in KV for 6 hours
- An "Analyze" option in every item card's 3-dot menu, with the result expanding inline on the card
- A "✨ Next to Consume" button in the nav bar that opens a ranked modal panel

---

## The Big Picture: How AI Calls Work

```
Browser clicks "Analyze" on a card
    │
    │  POST /api/ai/analyze/01JQVHZ3B...
    ▼
Hono Worker (worker/src/routes/ai.ts)
    │
    │  1. Fetch item from D1 (verify it belongs to this user)
    │  2. Check ai_cache table in D1
    │     — cached AND < 7 days old AND item not updated since cache? → return immediately
    │     — otherwise → continue
    │
    │  3. Build a content-type-aware prompt
    │     e.g. for a movie: "Focus on premise, tone, themes, no spoilers..."
    │
    │  4. POST to Gemini API
    ▼
https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-lite:generateContent
    │
    │  { summary, key_points[], recommendation, mood }  (structured JSON)
    ▼
Worker
    │  5. INSERT or UPDATE ai_cache row
    │  6. Return { cached: false, result: { ... } }
    ▼
Browser
    │  Expands inline panel on the ItemCard with the analysis
```

---

## Part 1: Why Gemini Instead of OpenAI?

Google's Gemini API has a completely free tier: 1,000 requests per day with the `gemini-2.0-flash-lite` model. For a personal content tracker that might make 10–30 AI calls on an active day, this budget is essentially infinite. OpenAI has no meaningful free tier for API usage.

Gemini also supports **structured output** natively. You can pass a JSON schema describing exactly what shape you want the response in, and Gemini guarantees its output matches that schema. This is called "constrained decoding" — Gemini generates tokens that always produce valid JSON matching the schema. No parsing, no "sometimes it returns markdown with JSON inside" surprises.

---

## Part 2: The Gemini Service (`worker/src/services/ai.ts`)

The service file has one private helper and three public functions.

**`callGemini(apiKey, prompt, schema)`**

This is the core function everything else builds on. It makes one HTTPS request to the Gemini API:

```ts
const res = await fetch(`${GEMINI_BASE}?key=${apiKey}`, {
  method: "POST",
  body: JSON.stringify({
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: {
      responseMimeType: "application/json",  // ← tells Gemini to respond in JSON
      responseSchema: schema,                // ← the exact shape we want
      temperature: 0.3,                      // ← lower = more predictable, less creative
      maxOutputTokens: 1024,
    },
  }),
});
```

`temperature: 0.3` is a dial between 0 (completely deterministic, always picks the most likely next token) and 1 (more varied and creative). For factual analysis and ranking tasks we want consistency, so 0.3 keeps it grounded.

The response looks like:
```json
{
  "candidates": [{
    "content": {
      "parts": [{ "text": "{ \"summary\": \"...\", \"key_points\": [...] }" }]
    }
  }]
}
```

We dig into `candidates[0].content.parts[0].text` and `JSON.parse` it. Because of structured output the parse never fails.

---

**`categorizeItem(apiKey, item)`**

Given an item's title, description, and URL domain, asks Gemini to confirm or correct its content type:

```
Classify this content item for a personal media tracker.
Title: Interstellar
Description: A team of explorers travel through a wormhole...
URL domain: themoviedb.org
Current type assigned by user: movie

Valid content types: book, movie, tv, podcast, youtube, article, tweet
Return the best matching type, your confidence (0-1), 1-4 short lowercase tags, and suggested status.
```

Returns: `{ content_type: "movie", confidence: 0.99, suggested_tags: ["sci-fi", "christopher-nolan"], suggested_status: "suggestions" }`

This function is implemented and ready but not yet wired into the item creation flow — Phase 6 will connect it to the tags system (suggested tags need the tags table fully built out first).

---

**`analyzeItem(apiKey, item)`**

Builds a content-type-aware prompt so the analysis is relevant to what the item actually is. A book prompt asks about themes and writing style; a movie prompt asks about tone and cinematography; a podcast prompt asks about host style and episode quality.

```ts
const TYPE_GUIDE: Record<string, string> = {
  book:    "Focus on: main themes, writing style, key insights, and who would most enjoy it.",
  movie:   "Focus on: premise, tone, cinematography, themes (no spoilers).",
  tv:      "Focus on: premise, pacing, season count/commitment, what makes it worth watching.",
  podcast: "Focus on: topics covered, host style, episode quality, target audience.",
  youtube: "Focus on: content type, production quality, creator style.",
  article: "Focus on: main argument, key takeaways, source credibility, reading time value.",
  tweet:   "Focus on: the core idea, significance, and context.",
};
```

The schema returned:
```ts
{
  summary: string;       // 2-3 sentences
  key_points: string[];  // 2-4 bullet points
  recommendation: string; // one sentence
  mood?: string;         // optional — e.g. "dark sci-fi thriller", "cozy mystery"
}
```

`mood` is optional in the schema. For articles and YouTube videos it's usually irrelevant; for movies and books it's a useful one-line vibe indicator.

---

**`rankNextList(apiKey, suggestions, preferences)`**

Takes the full list of Suggestions items and the user's taste preferences (a freeform string they can set in their profile, like "I love hard sci-fi and literary fiction, dislike horror"). Asks Gemini to rank them:

```
Rank these 12 content items from best to consume next (#1) to last.
User taste preferences: I love hard sci-fi and literary fiction, dislike horror

Items:
- [01JQVHZ3...] "Dune" (book by Frank Herbert)
- [01JQVHZ4...] "Severance" (tv)
- ...

Return all 12 items ranked. Each needs its exact id, rank number, and a 1-sentence reason.
```

The structured output schema is an array of `{ id, rank, reason }` objects. Gemini returns all items, ranked, without hallucinating extra ones or dropping any.

---

## Part 3: Caching Strategy

AI calls are expensive (even on the free tier — you have a daily budget). Two levels of caching prevent redundant calls:

### D1 cache for item analysis (`ai_cache` table)

```ts
const isFresh =
  cached &&
  Date.now() - cached.createdAt < CACHE_MAX_AGE_MS &&  // < 7 days old
  item.updatedAt <= cached.createdAt;                   // item not changed since cache
```

The second condition is the smart part. If a user edits the item's description or title after it was analysed, the cached analysis is now about an old version of the item. By comparing `item.updatedAt` against `cached.createdAt`, the cache is automatically invalidated when the item changes — no manual "refresh analysis" needed.

If the cache is stale, the worker calls Gemini and then does an **upsert**:
- If there's an existing cache row: `UPDATE ai_cache SET result = ..., createdAt = ... WHERE id = ...`
- If there isn't: `INSERT INTO ai_cache ...`

This keeps the `ai_cache` table lean — one row per item per analysis type, never accumulating history.

### KV cache for the "Next" list

The ranked list is cached in **Cloudflare KV** (not D1) for 6 hours. Why KV instead of D1?

D1 is a relational database — good for structured data you need to query and filter. KV is a key-value store — good for caching entire blobs by a simple key. The ranked list is fetched as a complete unit (we always want the whole ranking, never a filtered subset), so KV is the right tool:

```ts
await c.env.SIRAJHUB_KV.put(
  `next_list:v1:${userId}`,     // key
  JSON.stringify(ranked),        // value (the full ranked array as JSON)
  { expirationTtl: 21600 }       // 6 hours in seconds — KV deletes it automatically
);
```

`expirationTtl` is built into KV — you don't need a cron job to clean up old entries. Pass `?refresh=1` to the endpoint to bypass this cache and force a fresh Gemini ranking.

---

## Part 4: The AI Route (`worker/src/routes/ai.ts`)

The AI router follows the same pattern as the items and ingest routers: a separate `new Hono()` mounted at `/api/ai` in `index.ts`.

**Why `POST` for analyze instead of `GET`?**
`GET` requests are sometimes cached by browsers, CDNs, and proxies. For a request that triggers a potentially expensive AI call and writes to the database, `POST` is semantically correct — it has side effects (the cache write) and should never be cached by intermediaries.

**The `?refresh=1` parameter on `GET /api/ai/next`:**
Rather than a separate `DELETE /api/ai/next/cache` endpoint, the refresh is just a query parameter on the same `GET`. The logic:
```ts
if (!refresh) {
  const cached = await c.env.SIRAJHUB_KV.get(kvKey, "json");
  if (cached) return c.json({ cached: true, result: cached });
}
// ... fetch fresh from D1 + Gemini
```
When `refresh=1`, the KV check is skipped entirely. The fresh result from Gemini overwrites the KV entry, so the next normal request sees the updated ranking.

---

## Part 5: The ItemCard AI Panel

The "Analyze" button is added to the 3-dot dropdown alongside "Archive" and "Delete". When clicked:

1. `setAnalysisOpen(true)` — immediately shows the panel area below the card content
2. If `analysis` state is `null` (first time), fire `analyzeItem(item.id)` via the mutation
3. While pending: show "Analyzing…" text
4. On success: `setAnalysis(data.result)` → the panel fills in with the full analysis

The analysis renders inline, expanding the card downward. This is intentional — showing it in a separate modal would lose the spatial context of which column the item is in. An inline panel keeps everything visible.

**The drag interference problem:**
All elements inside the analysis panel need `onPointerDown: e.stopPropagation()`. Without this, clicking anywhere inside the panel — including the "Close" button — starts a drag operation through `@dnd-kit`'s pointer event handlers. `stopPropagation()` prevents the event from bubbling up to the draggable wrapper.

---

## Part 6: The "Next to Consume" Panel (`NextListPanel.tsx`)

The panel is a modal overlay, not a full page route. This keeps the interaction lightweight — you click the button, see your ranking, close it, and drag an item straight into "In Progress" without a navigation. The nav button itself shows the suggestion count as a badge so you can see at a glance how many unranked items are waiting.

The `useNextList()` hook is configured with `enabled: false`:
```ts
useQuery({
  queryKey: ["ai-next"],
  queryFn: () => aiApi.getNextList(),
  enabled: false,           // don't auto-fetch on mount
  staleTime: 6 * 60 * 60 * 1000,  // treat as fresh for 6 hours
})
```

`enabled: false` means TanStack Query won't fire this query automatically when the component mounts. It only fetches when `refetch()` is called manually (triggered by the panel opening). `staleTime` matches the KV cache TTL — the browser won't re-request if you close and reopen the panel within 6 hours, because the cached data is considered fresh.

The "Refresh" button calls `useRefreshNextList()`, which calls `getNextList(true)` (the `?refresh=1` endpoint) and then does `qc.setQueryData(["ai-next"], data)` to push the fresh result directly into the query cache without a second fetch.

---

## Phase 5 Summary

| What | How | Why |
|---|---|---|
| AI model | `gemini-2.0-flash-lite` | Free tier (1,000 req/day), structured output support |
| Structured output | `responseSchema` in Gemini config | Guarantees valid JSON with the exact shape we need — no parsing fragility |
| Item analysis | `POST /api/ai/analyze/:id` in Hono | Server-side keeps the API key private; easy to add rate limiting later |
| Analysis cache | `ai_cache` D1 table, 7-day TTL | Avoids re-calling Gemini on every card open; auto-invalidates when item is edited |
| Next list cache | Cloudflare KV, 6-hour TTL with `expirationTtl` | KV is the right tool for whole-blob caching; auto-expiry handled by the platform |
| Stale cache detection | `item.updatedAt <= cached.createdAt` | Analysis automatically refreshes when the item changes, without manual intervention |
| UI: analyze button | Inline panel on the ItemCard | Keeps spatial context; no navigation needed |
| UI: next list | Modal panel from nav bar button | Lightweight interaction; doesn't disrupt the board view |
| Drag safety | `onPointerDown: stopPropagation` on panel elements | Prevents @dnd-kit from treating clicks inside the panel as drag starts |
| Content-type prompts | Different guide text per `content_type` | The analysis is relevant to what the item actually is, not a generic summary |

---

---

---

# Phase 6 — Polish & Search

## What Phase 6 Was About

Phase 6 is the layer that makes the app feel finished. The core features (add items, view them, AI analysis) were all working, but the app had one view, no search, no way to organise by tag, no settings, and no real mobile experience. Phase 6 adds all of that.

By the end of Phase 6 we had:
- A masonry Grid view alongside the Kanban Board, with a toggle that remembers your preference
- Content-type filter pills above both views so you can focus on just books, or just movies
- A full tags system: create tags, assign them to items, filter the board/grid by tag
- A Cmd+K search palette that searches your library instantly from any page
- An Item Detail side panel that opens when you click a card title — with status, rating, tags, and notes all editable in one place
- A Settings page for profile, AI taste preferences, tag management, JSON export, and cache clearing
- A mobile-responsive nav with a hamburger menu

---

## The Big Picture: How the New Pieces Connect

```
Nav bar
  ├── Search bar (desktop) / 🔍 icon (mobile) → opens SearchCommand (Cmd+K)
  ├── ✨ Next to Consume → NextListPanel (Phase 5, unchanged)
  ├── + Add → AddItemDialog (Phase 3, unchanged)
  ├── ⚙ → /settings page
  └── ☰ (mobile) → dropdown with all of the above

Index page (/)
  ├── Filter bar: [All] [📚 Book 12] [🎬 Movie 4] …
  ├── Tag filter row: [sci-fi] [must-read] [in-queue] …
  ├── View toggle: [⊞ Board] [⊟ Grid]  ← saved to localStorage
  │
  ├── BoardView (4 Kanban columns)       ← same drag-and-drop
  │    └── ItemCard × N
  │         ├── click title → ItemDetailPanel
  │         └── tag pills on card
  │
  └── GridView (masonry CSS columns)
       └── ItemCard × N (same component)

ItemDetailPanel (right slide-over)
  ├── Cover / title / creator / release date / source link
  ├── Status selector
  ├── Star rating
  ├── Tags: assign existing, create new, remove
  └── Notes textarea (auto-saves on blur)

/settings
  ├── Profile: display name, email
  ├── AI Preferences: taste profile text → fed to Gemini ranking
  ├── Tags: view + delete all tags
  └── Data: Export JSON · Clear AI cache
```

---

## Part 1: The Grid View (`components/GridView.tsx`)

The Grid view is a masonry layout — cards stack in columns and each card is as tall as its content, creating an organic magazine-like layout rather than uniform rows.

**CSS `columns` — the right tool for masonry:**
```css
.grid-view {
  column-count: 4;
  column-gap: 14px;
}
```

`column-count` is a CSS property that distributes content across vertical columns the same way a newspaper lays out text. Each child element is placed in the next available column position. `break-inside: avoid` on each card prevents a card from being split across two columns.

Compare this to a CSS Grid approach (which requires JavaScript to measure card heights and calculate placement) — the pure CSS `columns` approach does it all natively with zero JavaScript.

**Responsive breakpoints in `index.css`:**
```css
.grid-view { column-count: 4; }
@media (max-width: 1100px) { .grid-view { column-count: 3; } }
@media (max-width: 720px)  { .grid-view { column-count: 2; } }
@media (max-width: 480px)  { .grid-view { column-count: 1; } }
```

This is set in a CSS class rather than inline styles because inline styles can't contain media queries — they apply unconditionally regardless of screen width.

**View toggle persisted to `localStorage`:**
```ts
const [view, setView] = useState<ViewMode>(() => {
  return (localStorage.getItem("sirajhub-view") as ViewMode) ?? "board";
});
```

The `useState` initialiser is a function (called "lazy initialisation"). Instead of reading localStorage on every render, React only calls this function once — when the component first mounts. Setting the view calls `localStorage.setItem(...)` to persist it for the next visit.

---

## Part 2: The Tags System

Tags are a many-to-many relationship: one item can have many tags, one tag can belong to many items. This is implemented with three database tables (already created in Phase 1):

```
tags table:      id, user_id, name, color
items table:     (existing)
item_tags table: item_id, tag_id  ← the join table
```

### The API Routes (`worker/src/routes/tags.ts`)

**Tag CRUD:**

| Route | What it does |
|---|---|
| `GET /api/tags` | Returns all tags owned by the current user |
| `POST /api/tags` | Creates a new tag `{ name, color }` |
| `DELETE /api/tags/:id` | Deletes a tag — cascades to `item_tags` via FK, so all assignments are removed automatically |

**Item-tag assignment:**

| Route | What it does |
|---|---|
| `GET /api/tags/item/:itemId` | Returns all tags currently on an item (JOIN query) |
| `POST /api/tags/item/:itemId` | Adds a tag to an item `{ tagId }` |
| `DELETE /api/tags/item/:itemId/:tagId` | Removes a specific tag from an item |

The POST assignment uses `.onConflictDoNothing()` so adding a tag that's already there is silently ignored — it's idempotent, no error if you click "add" twice.

**The JOIN query to get an item's tags:**
```ts
const rows = await db
  .select({ tag: tags })
  .from(itemTags)
  .innerJoin(tags, eq(itemTags.tagId, tags.id))
  .where(eq(itemTags.itemId, itemId));

return c.json(rows.map((r) => r.tag));
```

`innerJoin` fetches rows from `item_tags` and simultaneously pulls the matching `tags` row for each. The result is the full tag objects (id, name, color) for the item, not just IDs.

### Frontend Tag Hooks (`hooks/useTags.ts`)

The hooks follow the same TanStack Query pattern as items: mutations invalidate the relevant query keys so the UI stays in sync.

`useItemTags(itemId)` is configured with `enabled: !!itemId` — the query only fires when an `itemId` is actually provided. When you close the detail panel (`itemId` becomes `null`), the query is automatically disabled. This prevents unnecessary API calls.

### Tag Display on Cards

The `ItemCard` component now accepts `allTags?: Tag[]` — the tags that are currently assigned to that specific item. It renders up to 3 as colored pills and shows "+N more" for the rest. This keeps cards compact while still showing the tags at a glance.

---

## Part 3: The Item Detail Panel (`components/ItemDetailPanel.tsx`)

Clicking any card's title opens a right-side slide-over panel. It's not a new route — it's a component that renders in a fixed position overlay, keeping the board visible behind it.

**Why a slide-over instead of a new page?**
A page navigation would lose the board's drag state and require loading the item data again. The slide-over keeps everything in context — you can see which column the item is in, close the panel, and immediately drag it somewhere else.

**Auto-save on notes:**
```ts
<textarea
  value={notes}
  onChange={(e) => setNotes(e.target.value)}
  onBlur={saveNotes}    // ← fires when textarea loses focus
/>
```

Notes are stored in local `useState` while the user types (so every keystroke doesn't trigger a PATCH request). `onBlur` fires when the user clicks away from the textarea — at that point we compare the current value to `item.notes` and only call `updateItem` if something actually changed. This pattern is called "save on blur" and feels natural for notes fields.

**Star rating — click to set, click same star to clear:**
```ts
onClick={() => updateItem({ id: item.id, rating: item.rating === n ? null : n })}
```

Clicking the same star you already have selected clears the rating (`null`). Clicking a different star updates to that value. One line handles both cases.

**Tag picker inside the panel:**
The tag picker has two sections: existing tags to pick from (colored buttons filtered to those not already on the item), and a "create new tag" row with a name input and a color swatch picker. Creating a new tag automatically adds it to the current item via `createTag()` → `onSuccess: addTag(tag.id)`.

---

## Part 4: The Search Command (`components/SearchCommand.tsx`)

The search palette opens with **Cmd+K** (or Ctrl+K on Windows). It's registered globally in `__root.tsx`:

```ts
useEffect(() => {
  function onKey(e: KeyboardEvent) {
    if ((e.metaKey || e.ctrlKey) && e.key === "k") {
      e.preventDefault();
      setSearchOpen((o) => !o);
    }
  }
  window.addEventListener("keydown", onKey);
  return () => window.removeEventListener("keydown", onKey);
}, []);
```

`e.preventDefault()` stops the browser from opening its own "find in page" dialog (which Cmd+K sometimes triggers). The cleanup function (`return () => removeEventListener(...)`) runs when the component unmounts, preventing memory leaks.

**Why client-side search instead of always calling the API?**

The items are already in the TanStack Query cache from the board/grid load. Filtering that array is instant — zero network latency, no loading spinner. For a personal library that tops out at a few hundred items, JavaScript can filter the entire list in under a millisecond.

```ts
const results = q.length < 1
  ? []
  : allItems.filter(
      (item) =>
        item.title.toLowerCase().includes(q) ||
        (item.creator ?? "").toLowerCase().includes(q) ||
        (item.description ?? "").toLowerCase().includes(q)
    ).slice(0, 20);
```

`slice(0, 20)` caps results to 20 to keep the list navigable. The `?? ""` handles nullable fields — `item.creator` can be `null`, and calling `.toLowerCase()` on `null` would crash.

The API-side `?q=` support was added to the items GET route (`LIKE %query%` on title and creator) for completeness and any future use case where you want server-side filtered results.

**Results grouped by content type:**
```ts
const grouped: Record<string, Item[]> = {};
for (const item of results) {
  if (!grouped[item.contentType]) grouped[item.contentType] = [];
  grouped[item.contentType].push(item);
}
```

This builds a plain object keyed by content type. `Object.entries(grouped)` then renders a section header per type (e.g. "📚 Book", "🎬 Movie") with its items below. Grouping makes scanning the results faster when you roughly know what type you're looking for.

---

## Part 5: The Settings Page (`routes/settings.tsx`)

The settings page lives at `/settings` — a full TanStack Router file-based route. The nav bar's `⚙` button is a `<Link to="/settings">` (not a `button`), so the browser treats it like navigation and the back button works.

**Profile and AI Preferences save independently:**
Each section has its own "Save" button that calls `updateProfile({ name })` or `updateProfile({ preferences })`. They share the same `PATCH /api/user/me` endpoint which only updates fields that are provided. This avoids a race condition where saving name and saving preferences simultaneously could overwrite each other.

**The "Saved ✓" flash pattern:**
```ts
updateProfile({ name }, {
  onSuccess: () => {
    setProfileSaved(true);
    setTimeout(() => setProfileSaved(false), 2000);
  }
});
```

The button text changes to "Saved ✓" for 2 seconds then reverts. `setTimeout` inside `onSuccess` is a simple, reliable way to implement this without a library. No toast component needed.

**JSON export — triggering a download from JavaScript:**
```ts
async function handleExport() {
  const res = await userApi.exportItems();  // fetch with credentials
  const blob = await res.blob();            // read the response body as a binary blob
  const url = URL.createObjectURL(blob);    // create a temporary in-memory URL
  const a = document.createElement("a");
  a.href = url;
  a.download = `sirajhub-export-${...}.json`;  // filename for the download
  a.click();                                     // programmatically trigger the download
  URL.revokeObjectURL(url);                      // release memory
}
```

The Worker sets `Content-Disposition: attachment; filename="..."` on the export response. This header tells the browser to download the response as a file rather than display it. The JavaScript above creates a temporary `<a>` element and simulates a click on it — this is the standard pattern for triggering file downloads from a `fetch` response.

`URL.revokeObjectURL` releases the temporary object URL from memory. Without it, the URL would persist until the page unloads.

**Clearing AI cache — two places to clear:**
```ts
// D1: delete all ai_cache rows for this user's items
await db.delete(aiCache).where(inArray(aiCache.contentId, itemIds));

// KV: delete the cached "next list" ranking
await c.env.SIRAJHUB_KV.delete(`next_list:v1:${userId}`);
```

The AI cache lives in two places — per-item analyses in D1, and the ranked next-list in KV. Both need to be cleared together or the "next list" would show stale data while item analyses were refreshed.

---

## Part 6: Responsive Mobile

**Board view — horizontal scroll:**
```ts
style={{
  display: "grid",
  gridTemplateColumns: "repeat(4, minmax(200px, 1fr))",
  overflowX: "auto",
}}
```

`minmax(200px, 1fr)` means each column is at least 200px wide and grows to fill available space on larger screens. On a 375px phone screen, 4 × 200px = 800px — wider than the viewport — so the container becomes horizontally scrollable. The four columns stay intact and the user swipes left/right to reveal them. No JavaScript needed.

**Nav — hiding elements by screen size:**
```tsx
<div className="hidden sm:flex items-center gap-2">
  {/* Desktop nav items */}
</div>
<div className="flex sm:hidden items-center gap-2">
  {/* Mobile: search icon + hamburger */}
</div>
```

Tailwind's `sm:` prefix applies a style from the `sm` breakpoint (640px) upward. `hidden sm:flex` means: hidden by default, flex from 640px up. `flex sm:hidden` means: flex by default, hidden from 640px up. This is the standard responsive pattern — no JavaScript, no resize listeners, just CSS.

The mobile hamburger menu renders as a dropdown below the nav bar when open, listing "Add Item", "Settings", and "Log out" as full-width buttons. Tapping any of them closes the menu.

---

## Phase 6 Summary

| What | How | Why |
|---|---|---|
| Grid view | CSS `column-count` masonry | Zero JavaScript, native browser layout, naturally responsive |
| View preference | `localStorage` in lazy `useState` initialiser | Read once on mount, not on every render |
| Tags DB | `tags` + `item_tags` join table, FK cascade | Standard many-to-many; cascade delete keeps data consistent |
| Tags API | Separate `tags.ts` router, idempotent `.onConflictDoNothing()` | Clean separation; safe to call add-tag multiple times |
| Item detail | Right slide-over, not a route | Keeps board context visible; no re-fetch needed |
| Notes | Controlled textarea + save on blur | Natural UX; avoids a PATCH on every keystroke |
| Star rating | Click same star to clear | Ternary in the onClick — one line for set and unset |
| Search | Client-side filter over TanStack Query cache | Instant; no API call needed for personal-scale data |
| Cmd+K | Global `keydown` listener in root layout | Available from any page; cleanup on unmount prevents leaks |
| Search results | Grouped by content type | Easier to scan when you roughly know the type |
| Settings | Independent save buttons per section | Avoids race conditions; clear feedback per field group |
| JSON export | `fetch` → blob → `URL.createObjectURL` → `<a>.click()` | Standard browser pattern for downloading API responses |
| Clear cache | Deletes D1 `ai_cache` rows + KV next-list key | Both caches must be cleared together or state is inconsistent |
| Mobile board | `minmax(200px, 1fr)` + `overflowX: auto` | Columns stay intact; horizontal scroll is native and free |
| Mobile nav | `hidden sm:flex` / `flex sm:hidden` Tailwind classes | Pure CSS — no resize listeners or JavaScript state |

---

---

---

# Phase 7 — Deferred Requirements

## What Phase 7 Was About

Phases 1–6 built a fully working app, but four features were explicitly deferred and never wired up. Phase 7 closes those gaps:

1. **Within-column drag reordering** — you could drag cards between columns (changing status) but not reorder cards within the same column
2. **AI auto-categorize on add** — the `categorizeItem()` function existed since Phase 5 but was never called from the UI
3. **AI "Suggest tags"** — the AI's tag suggestions were being generated but discarded; now surfaced as clickable chips in the item detail panel
4. **Auto-timestamps on status change** — `started_at` and `finished_at` columns existed in the database since Phase 1 but were never written

---

## Part 1: Within-Column Drag Reordering

### The problem with the old drag code

Phase 3 used `useDraggable` from `@dnd-kit/core` for each card. `useDraggable` only knows how to drag — it doesn't know about the order of items in a list. So when you dropped a card onto another card in the same column, nothing happened:

```ts
// Old handleDragEnd — early-returned for within-column drops
if (sourceColumn === destColumn) return;  // ← just gave up
```

The `@dnd-kit/sortable` package (which was installed but unused) adds the concept of a **sortable list**: items know their position in the list, and dropping one item onto another reorders them.

### SortableContext

```tsx
// Old: plain list of DraggableCards
{items.map((item) => <DraggableCard key={item.id} item={item} />)}

// New: items wrapped in a SortableContext
<SortableContext items={items.map(i => i.id)} strategy={verticalListSortingStrategy}>
  {items.map((item) => <SortableCard key={item.id} item={item} />)}
</SortableContext>
```

`SortableContext` takes an ordered array of IDs. When a drag ends, `@dnd-kit/sortable` knows the old index and new index of the moved item within that list. `verticalListSortingStrategy` tells it the items are stacked vertically — this affects the "snap" ghost animation during the drag.

### useSortable vs useDraggable

`useSortable` is a superset of `useDraggable`. It gives you everything `useDraggable` gives (listeners, attributes, setNodeRef, isDragging) plus two new things:

| Extra from useSortable | What it does |
|---|---|
| `transform` | The CSS translate to apply during sorting — animates the card to its new position |
| `transition` | The CSS transition string for smooth animation |

```tsx
const { attributes, listeners, setNodeRef, isDragging, transform, transition } = useSortable({ id: item.id });

// Apply the animated position during dragging
<div
  style={{
    transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
    transition,
  }}
>
```

Without `transform` applied, the card would teleport to its destination on drop rather than smoothly sliding.

### How positions are stored and updated

The `items` table has a `position INTEGER` column. When you drag a card to a new position within a column, we need to persist that order. The strategy used here is **index normalisation**: after every reorder, each item's position is set to its array index × 1000.

```ts
const reordered = arrayMove(columnItems, oldIndex, newIndex);
// reordered is the new desired order

const updates = reordered
  .map((item, i) => ({ id: item.id, newPos: i * 1000, oldPos: item.position ?? 0 }))
  .filter(({ newPos, oldPos }) => newPos !== oldPos);  // skip items that didn't move

Promise.all(updates.map(({ id, newPos }) => itemsApi.update(id, { position: newPos })))
  .then(() => qc.invalidateQueries({ queryKey: ['items'] }));
```

**Why index × 1000 instead of midpoint?**
The midpoint approach (set the moved item to the average of its neighbours' positions) is elegant for single updates, but it breaks down when many items have the same position (which was the case here — all items defaulted to `position: 0`). Normalising to `index * 1000` always produces distinct, stable positions and doesn't require knowing the neighbours' values in advance.

**Why `Promise.all` instead of a loop?**
`Promise.all` sends all PATCH requests simultaneously, so N requests take roughly the same time as 1 request. A sequential loop would be N times slower. For a personal board with ~10-20 items per column, this is fast enough that it feels instant.

After all updates resolve, a single `invalidateQueries` call re-fetches the items in their new order.

---

## Part 2: AI Auto-Categorize on Add

### What categorize does

`categorizeItem()` in `services/ai.ts` sends a lightweight Gemini call:

```
Input:  title, description, URL domain, current content type
Output: { content_type, confidence (0–1), suggested_tags, suggested_status }
```

The idea is that the URL-based dispatcher (Phase 4) is very accurate for recognisable URLs (YouTube, TMDB, etc.), but for ambiguous cases — a podcast episode URL, a blog post that could be an article or a tweet thread — the AI can provide a second opinion.

### The new endpoint

```ts
// worker/src/routes/ai.ts
router.post("/categorize", async (c) => {
  const body = await c.req.json();
  const result = await categorizeItem(c.env.GEMINI_API_KEY, body);
  return c.json(result);
});
```

No caching here — `categorizeItem` is fast (one small Gemini call) and is only triggered by explicit user actions, so caching would add complexity for no real benefit.

### The UX flow in AddItemDialog

```
User pastes URL
    │
    ▼
POST /api/ingest  →  metadata fills the form (title, type, cover, etc.)
    │
    ▼ (fires in background, non-blocking)
POST /api/ai/categorize
    │
    ├── confidence ≤ 0.7 → no UI change (ingest's type detection was probably right)
    │
    └── confidence > 0.7 AND type differs from fetched type
            │
            ▼
        Shows: "AI suggests: [Podcast] →"  (clickable chip below the Type select)
        Clicking the chip switches the type and clears the chip
        Changing the type manually also clears the chip
```

The key design decision: fire it **after** ingest succeeds, not before or during. There's no point in running AI categorization without a title and description to work with. And it's non-blocking — the user can start editing the form immediately; the chip appears a second later if AI disagrees.

---

## Part 3: AI "Suggest Tags"

### Why this lives in ItemDetailPanel, not AddItemDialog

Tags can only be added to items that already exist in the database (the `item_tags` join table requires an `item_id`). So the natural home is the detail panel, which opens after an item has been created.

### The "✨ Suggest" button

```tsx
<button onClick={handleSuggestTags} disabled={suggestingTags}>
  {suggestingTags ? "…" : "✨ Suggest"}
</button>
```

On click, this fires the same `POST /api/ai/categorize` endpoint used by the Add dialog. The response includes `suggested_tags` — an array of 1–4 short lowercase strings like `["sci-fi", "thriller", "must-watch"]`.

### Filtering and rendering suggestions

```ts
onSuccess(result) {
  const existing = new Set(itemTags.map(t => t.name.toLowerCase()));
  const fresh = result.suggested_tags.filter(s => !existing.has(s.toLowerCase()));
  setAiTagSuggestions(fresh.length > 0 ? fresh : []);
}
```

Tags the item already has are filtered out — there's no point suggesting a tag that's already applied. The remaining suggestions render as `"+ [name]"` chips.

### Applying a suggested tag

When a chip is clicked, the logic checks whether a tag with that name already exists in the user's tag library:

```ts
function handleApplySuggestedTag(name: string) {
  const match = allTags.find(t => t.name.toLowerCase() === name.toLowerCase());
  if (match) {
    addTag(match.id);               // reuse existing tag
  } else {
    createTag(                      // create new tag, then add it
      { name, color: randomColor },
      { onSuccess: tag => addTag(tag.id) }
    );
  }
  setAiTagSuggestions(prev => prev?.filter(s => s !== name) ?? null);  // remove from chips
}
```

This reuse-or-create pattern is important: if you've already tagged another movie "sci-fi", clicking "sci-fi" on a new item should link to the same tag — not create a duplicate. The case-insensitive match handles `"Sci-Fi"` vs `"sci-fi"` variations.

---

## Part 4: Auto-Timestamps on Status Transition

### The schema had it; the code didn't

The `items` table has had `started_at INTEGER` and `finished_at INTEGER` columns since Phase 1. But the PATCH handler only wrote whatever was explicitly sent in the request body. Nobody ever sent these fields, so they stayed NULL forever.

### The fix: check the transition in the worker

The PATCH handler now reads the current row's `status`, `startedAt`, and `finishedAt` before applying updates:

```ts
// Before: only fetched id
const [existing] = await db.select({ id: items.id }).from(items).where(...);

// After: fetch the fields we need to reason about
const [existing] = await db
  .select({ id: items.id, status: items.status, startedAt: items.startedAt, finishedAt: items.finishedAt })
  .from(items).where(...);
```

Then, after building the update object from the request body:

```ts
if ("status" in body && body.status !== existing.status) {
  // Status is actually changing (not just sending the same value)

  if (body.status === "in_progress" && existing.startedAt == null && !("startedAt" in body)) {
    update.startedAt = now;   // first time entering "in progress" — record it
  }
  if (body.status === "finished" && existing.finishedAt == null && !("finishedAt" in body)) {
    update.finishedAt = now;  // first time finishing — record it
  }
}
```

**Three guards on each timestamp:**
1. `body.status !== existing.status` — only fire on real status changes
2. `existing.startedAt == null` — only set once (the first time you start it)
3. `!("startedAt" in body)` — if the caller explicitly provides the timestamp, respect it

The third guard means you can still override the timestamp manually from the UI if needed, and the auto-logic won't stomp on it.

**What doesn't get cleared:**
If you drag an item from "In Progress" back to "Suggestions", `startedAt` is kept. This is intentional — it's a historical record of when you first picked something up, not a live status indicator.

### Where the timestamps appear

The `ItemDetailPanel` timestamps row now shows all four dates when present:

```tsx
<div>
  Added {new Date(item.createdAt).toLocaleDateString()}
  {item.updatedAt !== item.createdAt && <> · Updated {new Date(item.updatedAt).toLocaleDateString()}</>}
  {item.startedAt && <> · Started {new Date(item.startedAt).toLocaleDateString()}</>}
  {item.finishedAt && <> · Finished {new Date(item.finishedAt).toLocaleDateString()}</>}
</div>
```

`toLocaleDateString()` formats as "4/15/2026" in the US, "15/04/2026" in the UK, etc. — it respects the browser's locale automatically.

---

## Phase 7 Summary

| What | How | Why |
|---|---|---|
| Within-column sort | `SortableContext` + `useSortable` + `arrayMove` | `useDraggable` only supports drag, not list reordering |
| Position persistence | Normalise entire column to `index * 1000` | Midpoint approach breaks when all positions are 0 (the default) |
| Batch position update | `Promise.all` + one `invalidateQueries` | All PATCHes fire in parallel; one refetch at the end |
| AI categorize endpoint | `POST /api/ai/categorize` — no caching | Fast one-shot call; caching adds complexity for no benefit |
| Type hint in dialog | Shows chip only if confidence > 0.7 AND type differs | Low-confidence or redundant suggestions are noise |
| Tag suggestions | Same categorize endpoint, filtered against existing item tags | Reuses existing endpoint; filters prevent duplicate-tag confusion |
| Apply suggested tag | Match existing tag by name or create new one | Prevents duplicate tags in the user's library |
| Auto-timestamps | Worker reads existing row, sets timestamp on first transition | Client never needs to know about the timestamp logic |
| Timestamp display | `item.startedAt` / `item.finishedAt` in detail panel | Historical record alongside the existing created/updated dates |

---

# V2 — Full Frontend Redesign

## What V2 Was About

V1 made SirajHub functional. You could track items, fetch metadata, use AI features, and move things through a workflow. But the UI still felt like one general-purpose app screen. V2 was about turning that working product into a more intentional product experience.

The main idea of V2 was:
- give the app a stronger design system
- make navigation feel like a real product shell
- create dedicated pages for each media type
- add a full item detail page instead of relying only on overlays
- move advanced settings into a better structure
- support per-user API keys and AI model selection

In short: V1 proved the app works. V2 made it feel designed.

---

## The Big Picture: How V2 Changes The App

```
V1
One main shell
    ├── top header
    ├── board / grid views
    └── slide-over detail panel

V2
Stronger app shell
    ├── sidebar navigation
    ├── slim topbar for actions
    ├── dashboard homepage
    ├── full settings area
    ├── full-page item detail route
    └── 7 dedicated media-type pages
```

V2 does not replace the backend idea of the app. It mostly reorganises how the frontend expresses that data, while adding a small but important backend improvement for user-owned API keys.

---

## V2 Phase 1 — shadcn/ui Setup

### What this phase was about

Before redesigning the interface, the project needed a stronger UI foundation. V1 already had working styling, but V2 wanted reusable components like dialogs, tabs, sheets, dropdowns, cards, and form controls that all behave consistently.

That is why the first V2 phase introduces shadcn/ui.

### What changed

This phase added the underlying setup needed to use shadcn components inside the existing app without throwing away the current styling:

- path aliases like `@/...` so component imports stay clean
- the `cn()` utility for merging Tailwind class names safely
- `components.json`, which tells shadcn how this project is configured
- a bridge between the app's existing OKLCH color system and shadcn's expected CSS variables
- the initial batch of generated UI components

### Why this matters

This phase is not about visible features. It is about making later phases easier and safer.

Without it, every new piece of UI in V2 would need custom one-off styling. With it, the app can build on a shared component base:

- sidebars
- sheets
- tabs
- dropdown menus
- cards
- inputs
- labels

That gives the redesign consistency.

### V2 Phase 1 Summary

| What | How | Why |
|---|---|---|
| UI foundation | shadcn/ui setup | Gives V2 a reusable component system |
| Import cleanup | `@/*` alias | Makes component imports cleaner and easier to manage |
| Class helper | `cn()` utility | Safely combines Tailwind classes |
| Theme bridge | OKLCH → shadcn tokens | Preserves the existing palette while enabling shadcn |
| Generated primitives | buttons, tabs, sheets, dialogs, inputs, etc. | Speeds up all later UI work |

---

## V2 Phase 2 — Navigation: Sidebar + Topbar

### What this phase was about

V1 navigation was still centered around a simple top header. That is fine for a smaller app, but once the app has many sections, the header becomes crowded. V2 Phase 2 turns the app into a true application shell.

Instead of one busy header, navigation gets split into two roles:

- Sidebar: where you go
- Topbar: what you do

### What changed

The root layout was rewritten into a two-column structure:

```tsx
<AppSidebar />
<div className="flex-1">
  <AppTopbar />
  <Outlet />
</div>
```

The sidebar became the permanent home for major routes:

- Dashboard
- Books
- Movies
- TV
- Podcasts
- Videos
- Articles
- Tweets
- Settings

The topbar became the place for global actions:

- mobile hamburger
- search
- `+ Add`
- user menu

### Mobile behavior

On mobile, the sidebar is not always visible. Instead, it appears inside a shadcn `Sheet` drawer opened from the hamburger button. This keeps the navigation structure the same across devices while changing only the presentation.

### Why this matters

This is more than a visual cleanup. It creates a framework for the rest of V2.

Later phases depend on this shell:
- dashboard widgets need a stable homepage layout
- settings need a real place in navigation
- media-specific pages need consistent route-to-route movement
- the detail page needs to live inside a proper app frame

### V2 Phase 2 Summary

| What | How | Why |
|---|---|---|
| App shell | Sidebar + topbar layout | Separates navigation from actions |
| Primary nav | `AppSidebar` | Gives each major section a permanent home |
| Global actions | `AppTopbar` | Keeps search/add/account actions easy to reach |
| Mobile nav | Sidebar inside `Sheet` | Preserves navigation on small screens |
| Root overlays | Kept in `__root.tsx` | Search, add-item, and detail tools still work everywhere |

---

## V2 Phase 3 — Backend: Per-User API Keys & Model Selection

### What this phase was about

V1 mostly assumed one set of API secrets stored at the environment level. That works during early development, but it is limiting once different users may want to bring their own keys or choose different AI models.

V2 Phase 3 adds that flexibility.

### What changed in the backend

The `user` table gained an `apiKeys` JSON field. Instead of creating many new columns, the app stores related user-owned secrets and preferences in one structured blob.

That JSON can hold values like:
- `gemini`
- `tmdb`
- `youtube`
- `googleBooks`
- `podcastIndexKey`
- `podcastIndexSecret`
- `aiModel`

A migration was added so the database structure matches the schema.

### New API behavior

The user routes gained settings endpoints that:

- report whether a key exists
- update a specific key or model selection
- never return the actual raw secret values back to the browser

That last part matters. The frontend only needs to know whether a key is set, not what it is.

### AI and ingest resolution

The worker routes were updated so they first check the current user's stored key, and only fall back to the environment secret if the user has not saved one.

The AI service was also updated so model choice is no longer hardcoded to one default. Each request can resolve the user's preferred model before calling Gemini.

### Why this matters

This phase makes the app more personal and more scalable:

- users can use their own quotas
- different users can prefer different AI models
- production secrets are no longer the only option

### V2 Phase 3 Summary

| What | How | Why |
|---|---|---|
| User-owned secrets | `user.apiKeys` JSON field | Lets each user store their own API config |
| DB update | migration for `api_keys` | Keeps schema and database aligned |
| Settings endpoints | `GET/PATCH /api/user/settings` | Lets the frontend manage keys safely |
| Key resolution | user key first, env fallback second | Makes the app flexible without breaking defaults |
| Model choice | `aiModel` stored per user | Lets AI features use different Gemini models |

---

## V2 Phase 4 — Expanded Settings Page

### What this phase was about

The original settings area already had useful features, but it had grown into a mixed collection of unrelated controls. V2 Phase 4 reorganises settings into a proper multi-tab page.

### The new structure

Settings is split into five tabs:

- Profile
- API Keys
- AI Model
- Tags
- Data

This is a usability improvement more than a technical one. Instead of one long page, the user can think in categories.

### What each tab does

**Profile**
- display name
- read-only email
- AI taste preferences

**API Keys**
- one row per external service
- masked saved state
- update flow without exposing raw secrets

**AI Model**
- lets the user choose which Gemini model to use
- stores that choice using the same settings backend

**Tags**
- moves tag management into its own clearer area

**Data**
- keeps export and AI cache maintenance actions together

### Why this matters

This phase turns settings from a utility page into a control center. That becomes more important as the app supports more personal preferences and more integrations.

### V2 Phase 4 Summary

| What | How | Why |
|---|---|---|
| Settings layout | shadcn `Tabs` | Organises settings into clear sections |
| API key management | masked key rows + save actions | Lets users manage secrets safely |
| Model selection | `RadioGroup` for AI models | Makes AI behavior user-configurable |
| Existing features moved | Tags and Data tabs | Reduces clutter and improves discoverability |

---

## V2 Phase 5 — Dashboard (`/`)

### What this phase was about

The V1 home page was useful, but still close to a generic board-and-grid mindset. V2 Phase 5 redefines `/` as a true dashboard: a page that answers "what matters right now?" at a glance.

### The new dashboard layout

The homepage is rebuilt into four main widgets:

```text
[TypeStats]
[InProgress]
[RecentlyAdded] [NextToConsume]
```

### What each widget does

**TypeStats**
- one tile per media type
- shows how many items exist in that category
- links into the dedicated route for that type

**InProgress**
- shows what the user is currently consuming
- highlights active work rather than all work

**RecentlyAdded**
- surfaces the newest additions
- helps the user reconnect with things they just saved

**NextToConsume**
- puts AI ranking directly on the homepage
- removes the need to open a separate panel first

### Why this matters

This phase changes the homepage from "one more page" into the command center of the app. It becomes useful even when the user does not want to manage the full library in detail.

### V2 Phase 5 Summary

| What | How | Why |
|---|---|---|
| Homepage redesign | widget-based dashboard | Makes `/` useful at a glance |
| Type overview | `TypeStats` cards | Gives quick access to each media category |
| Current activity | `InProgressItems` | Highlights active items |
| Fresh context | `RecentlyAdded` | Surfaces the newest saved content |
| AI guidance | inline `NextToConsume` | Makes recommendations visible immediately |

---

## V2 Phase 6 — Item Detail Page (`/item/$id`)

### What this phase was about

V1 already had an item detail slide-over, which was great for quick inspection. But some item interactions had become too rich to live only inside a panel. V2 Phase 6 adds a full-page item route.

### What changed

The app gained a new dynamic route:

```text
/item/$id
```

Instead of opening only a side panel, users can now navigate directly to a dedicated page for one item.

### Layout idea

The item page is split into two major areas:

**Left side**
- cover or poster
- title and creator
- release date, duration, status, rating, source link

**Right side**
- editable fields
- notes
- tag manager
- AI analysis panel

### Reusable pieces

This phase also extracts shared item-detail logic into reusable components:

- `AIPanel`
- `InlineTagManager`

That way both the full-page detail view and the older slide-over can share the same behavior instead of duplicating logic.

### Why this matters

This phase upgrades SirajHub from a dashboard-centric app into a route-centric app. Individual items become first-class pages, which is important for:

- deeper editing
- direct linking
- better navigation history
- more room for AI output and metadata

### V2 Phase 6 Summary

| What | How | Why |
|---|---|---|
| Item route | `/item/$id` | Makes individual items directly navigable |
| Editing UX | inline field editing | Lets the user update details without modal friction |
| Shared AI UI | `AIPanel` | Reuses analysis and suggestion features cleanly |
| Shared tag UI | `InlineTagManager` | Prevents tag logic duplication |
| Better navigation | back flow + direct routes | Makes item exploration feel more natural |

---

## V2 Phase 7 — Per-Type Artistic Views

### What this phase was about

This is the most visually ambitious V2 phase. In V1, different media types mostly shared the same presentation. But books, movies, podcasts, articles, tweets, and videos do not feel the same in real life. V2 Phase 7 gives each of them a page style that matches the medium.

### The core idea

Each media type gets:
- its own route
- its own layout component
- the same underlying data source
- the same status filtering idea

So the data model stays consistent, but the visual language changes based on the content type.

### The seven views

**Articles**
- a text-first reading list
- emphasizes title, source, author, date, and reading time

**Tweets**
- a centered feed
- emphasizes short-form text and social-post rhythm

**Podcasts**
- square artwork grid
- emphasizes cover art and show identity

**Videos**
- wide thumbnail grid
- emphasizes 16:9 imagery and duration

**Movies**
- dense poster wall
- emphasizes visual browsing like a film catalog

**TV**
- similar to movies, but with season-aware metadata

**Books**
- a shelf-based presentation with spines
- the most custom layout of the set

### Why this matters

This phase gives SirajHub personality. Instead of treating every item as a generic card, the interface reflects how people naturally think about each medium.

That makes the product feel less like a spreadsheet and more like a curated media space.

### V2 Phase 7 Summary

| What | How | Why |
|---|---|---|
| Dedicated type routes | one route per media type | Gives each category its own home |
| Custom view components | separate layout per medium | Matches UI style to content style |
| Shared filtering idea | status tabs/pills | Keeps interaction patterns familiar |
| Bookshelf / poster / feed / list layouts | medium-specific presentation | Gives the app a stronger identity |
| Item linking | cards lead to `/item/$id` | Connects browsing views to deeper detail |

---

## V2 Files Changed

### Frontend additions

V2 adds or heavily expands a large number of frontend files, including:

- shadcn configuration and generated UI components
- `AppSidebar` and `AppTopbar`
- dashboard widgets
- `AIPanel` and `InlineTagManager`
- per-type view components
- dedicated routes for books, movies, TV, podcasts, videos, articles, tweets, and item detail

### Frontend modifications

Important existing files also evolve during V2:

- `apps/web/src/routes/__root.tsx`
- `apps/web/src/routes/index.tsx`
- `apps/web/src/routes/settings.tsx`
- `apps/web/src/index.css`
- `apps/web/src/lib/api.ts`
- `apps/web/src/hooks/useUser.ts`
- project config files for aliases and component setup

### Backend modifications

The backend changes are smaller than the frontend redesign, but still important:

- migration for `user.apiKeys`
- schema update
- user settings routes
- AI and ingest key-resolution changes
- Gemini model resolution support

---

## V2 Summary Table

| Phase | Goal | Status |
|---|---|---|
| V2 Phase 1 | Install shadcn/ui and prepare the design system | Complete |
| V2 Phase 2 | Replace the header-only shell with sidebar + topbar navigation | Complete |
| V2 Phase 3 | Add per-user API keys and AI model selection | Complete |
| V2 Phase 4 | Rebuild Settings into a tabbed control center | Complete |
| V2 Phase 5 | Turn `/` into a real dashboard | Complete |
| V2 Phase 6 | Add a full-page item detail route | Complete |
| V2 Phase 7 | Build artistic per-type views for all media categories | Complete |

---

# V2.1 — Visual System Refinement

## What V2.1 Was About

The first V2 redesign changed the structure of the app successfully, but the visual result was not where it needed to be yet.

Two issues showed up immediately:

1. the overall look and typography did not match the intended reference well enough
2. the first redesign introduced some layout problems, especially in the sidebar and the dashboard stats area

So V2.1 is not a brand-new product phase. It is a refinement phase.

Its job was:
- replace the earlier playful/hand-drawn visual language
- move the app toward a softer analytics-dashboard feel
- fix the usability regressions caused by the first pass

In short: V2 built the new shell and pages. V2.1 made that redesign feel more correct.

---

## The Big Picture: What Changed In V2.1

```text
Earlier V2 redesign
    ├── cream paper background
    ├── dotted texture
    ├── hand-drawn display typography
    ├── chunky borders and shadows
    └── some cramped layouts

V2.1
    ├── soft light dashboard background
    ├── cleaner sans typography
    ├── white cards with subtle borders
    ├── blue/lilac analytics accents
    ├── calmer sidebar and topbar
    └── rebalanced dashboard layout
```

This means V2.1 is both:
- a design-system correction
- a layout-polish pass

---

## V2.1 Step 1 — Soft Analytics Theme Pass

### What this step was about

The earlier redesign leaned too hard into a handmade, sketch-like style. That looked distinctive, but it moved too far away from the dashboard reference and made the app feel heavier and noisier than intended.

This step resets the visual language.

### What changed

The global design system in `apps/web/src/index.css` was rebuilt around a soft light analytics palette:

- neutral page background
- white and near-white surfaces
- pale blue and lilac accents
- softer shadows
- lighter borders
- cleaner typography

The app also stopped using:

- dotted paper backgrounds
- marker-style display text
- thick, ink-like border treatments

### Shared UI components were rethemed

The redesign was pushed down into the reusable primitives, not just painted onto one page.

That includes:

- buttons
- badges
- cards
- inputs
- textareas
- tabs
- selects
- dropdown menus
- dialogs
- sheets
- sidebar primitives

This is important because it means pages, overlays, and small interactions all now speak the same visual language.

### Which pages changed

The redesign was applied broadly across the frontend:

- app shell
- dashboard
- settings
- login page
- item detail route
- item detail slide-over
- add item dialog
- search dialog
- next-to-consume dialog
- AI panel
- tag manager

### Why this matters

If you only restyle the homepage, the product feels inconsistent. V2.1 instead makes the design system feel shared across the whole app.

That gives SirajHub a more polished product feeling instead of a "homepage plus leftovers" feeling.

### V2.1 Step 1 Summary

| What | How | Why |
|---|---|---|
| New visual direction | soft analytics look | Matches the intended reference more closely |
| Typography reset | modern sans system | Removes the hand-drawn look that felt off |
| Surface redesign | lighter cards + softer borders/shadows | Makes the app feel calmer and more premium |
| Shared primitive update | retheme shadcn UI components | Keeps styling consistent across screens |
| Whole-app rollout | auth + shell + pages + overlays | Prevents the redesign from feeling partial |

---

## V2.1 Step 2 — Sidebar And Dashboard Corrections

### What this step was about

After the redesign shipped, two concrete usability problems were spotted:

- the sidebar header and footer were taking too much vertical space
- the media-type stats were squeezed into a narrow area on the dashboard, making them hard to read

This step fixes those problems without changing the underlying routes or features.

### Sidebar correction

The original redesigned sidebar had:

- a large brand card at the top
- extra descriptive text inside that card
- a workspace card at the bottom with additional explanatory copy

That looked fine in isolation, but on a real laptop-height viewport it pushed the actual navigation down too far. It also made the bottom card feel clipped.

So the sidebar was simplified:

- the top descriptive block was removed
- the brand card became more compact
- the footer card was reduced in height
- the "Workspace Preferences" label was shortened to "Preferences"

The effect is simple: more space goes to navigation, less space goes to decoration.

### Dashboard stats correction

The first soft redesign kept the type stats inside the hero area. That made the hero try to do too much:

- show the main message
- show the tracked-items badge
- show all seven type stats

Because the hero column was not wide enough, the type stats became cramped and difficult to scan.

So the dashboard was rebalanced:

- the hero card now focuses on the message only
- the type stats moved into their own dedicated full-width `Library Types` card
- each stat tile became horizontal instead of vertically stacked

That makes each tile easier to read because the icon, label, and count have more room.

### Why this matters

This is a good example of the difference between "styled" and "usable."

A layout can technically look attractive, but if navigation is forced to scroll or key numbers are unreadable, the design still is not doing its job.

V2.1 fixes that by giving the app more visual restraint.

### V2.1 Step 2 Summary

| What | How | Why |
|---|---|---|
| Sidebar simplification | remove extra copy, compress header/footer cards | Gives the nav more space and prevents clipping |
| Footer cleanup | shorter settings label and less text | Makes the lower card fit comfortably |
| Dashboard rebalance | move type stats into their own card | Prevents the hero from becoming overcrowded |
| Stat tile redesign | wider horizontal tiles | Makes counts and labels readable on laptop widths |

---

## V2.1 Files Changed

V2.1 mostly modifies existing frontend files rather than introducing many new ones.

The most important updated areas are:

- `apps/web/src/index.css`
- `apps/web/src/routes/__root.tsx`
- `apps/web/src/routes/index.tsx`
- `apps/web/src/routes/login.tsx`
- `apps/web/src/routes/settings.tsx`
- `apps/web/src/routes/item.$id.tsx`
- `apps/web/src/components/AppSidebar.tsx`
- `apps/web/src/components/AppTopbar.tsx`
- `apps/web/src/components/AIPanel.tsx`
- `apps/web/src/components/InlineTagManager.tsx`
- `apps/web/src/components/dashboard/TypeStats.tsx`
- shared shadcn UI primitives under `apps/web/src/components/ui/`

---

## V2.1 Summary Table

| Step | Goal | Status |
|---|---|---|
| V2.1 Step 1 | Replace the earlier redesign with a softer analytics-style visual system | Complete |
| V2.1 Step 2 | Simplify the sidebar and make dashboard type stats readable | Complete |
