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

*Next section will be added after Phase 3 (Core CRUD) is complete.*
