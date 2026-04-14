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
