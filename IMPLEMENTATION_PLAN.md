# SirajHub — Implementation Plan

---

## Your Pre-Work Checklist (Do These First)

Before any code is written, you need these accounts and keys set up. Everything here is free.

### Accounts to Create / Activate

- [ ] **Cloudflare account** — cloudflare.com (likely already have one)
  - Enable Workers & Pages (free plan is fine)
  - Add your domain to Cloudflare DNS if not already there
- [ ] **Google Cloud account** — console.cloud.google.com
  - Needed for: Google Books API + YouTube Data API v3
- [ ] **TMDB account** — themoviedb.org/signup
  - Needed for: Movies & TV metadata
- [ ] **Podcast Index account** — api.podcastindex.org
  - Needed for: Podcast metadata
- [ ] **Google AI Studio account** — aistudio.google.com
  - Needed for: Gemini 2.5 Flash-Lite API key

### API Keys to Generate

| Key                                          | Where to Get It                                                                                         | Where It Will Go         |
| -------------------------------------------- | ------------------------------------------------------------------------------------------------------- | ------------------------ |
| `GEMINI_API_KEY`                             | aistudio.google.com → Get API Key                                                                       | Cloudflare Worker secret |
| `TMDB_API_KEY`                               | themoviedb.org → Settings → API                                                                         | Cloudflare Worker secret |
| `YOUTUBE_API_KEY`                            | Google Cloud Console → APIs & Services → Credentials → Create API Key → restrict to YouTube Data API v3 | Cloudflare Worker secret |
| `GOOGLE_BOOKS_API_KEY`                       | Same Google Cloud project → enable Books API → same or new API key                                      | Cloudflare Worker secret |
| `PODCAST_INDEX_KEY` + `PODCAST_INDEX_SECRET` | api.podcastindex.org → register                                                                         | Cloudflare Worker secret |

### Cloudflare Resources to Create (via Dashboard or Wrangler CLI)

- [ ] **D1 Database** — name it `sirajhub-db`
  - Cloudflare Dashboard → Workers & Pages → D1 → Create database
- [ ] **KV Namespace** — name it `SIRAJHUB_KV`
  - Cloudflare Dashboard → Workers & Pages → KV → Create namespace
- [ ] **Worker** — will be created automatically on first `wrangler deploy`, but note the subdomain

### Local Tools to Install

- [x] **Node.js 20+** — nodejs.org
- [x] **pnpm** — `npm install -g pnpm`
- [ ] **Wrangler CLI** — `npm install -g wrangler` then `wrangler login`
- [x] **Git** — already installed

---

## Phase 1 — Foundation ✅ COMPLETE

> Goal: Runnable "hello world" with the full stack wired together locally. No features yet.

### 1.1 — Monorepo Scaffold

- [x] Init root `package.json` with pnpm workspaces (`apps/*`, `worker`)
- [x] Create `pnpm-workspace.yaml`
- [x] Create root `.gitignore`
- [x] Create `wrangler.toml` with D1 + KV bindings and static assets pointing to `apps/web/dist`

### 1.2 — Worker Skeleton

- [x] `worker/package.json` with Hono, Drizzle, `ulidx`, `wrangler` dev deps
- [x] `worker/src/index.ts` — Hono app with one `GET /api/health` route returning `{ ok: true }`
- [x] `worker/src/types.ts` — `Env` interface with D1 and KV binding types
- [x] Verify `wrangler dev` starts and health check responds

### 1.3 — Database Schema

- [x] `worker/src/db/schema.ts` — full Drizzle schema (users, sessions, items, tags, item_tags, ai_cache, url_cache)
- [x] `worker/drizzle.config.ts` — points to local D1 for migrations
- [x] Run `drizzle-kit generate` → creates `worker/src/db/migrations/`
- [x] Run `wrangler d1 migrations apply sirajhub-db --local` — applies to local D1
- [x] Verified all 7 tables exist in local D1

### 1.4 — React App Scaffold

- [x] `apps/web/` — Vite 6 + React 19 + TypeScript scaffold
- [x] Install: TanStack Router, TanStack Query, Tailwind CSS v4, `@cloudflare/vite-plugin`
- [x] `apps/web/vite.config.ts` — `@cloudflare/vite-plugin` proxies API calls to local Worker
- [x] TanStack Router file-based routing — `routeTree.gen.ts` auto-generated on `pnpm dev`
- [x] OKLCH dark color palette set as CSS custom properties in `index.css`
- [x] `routes/index.tsx` renders SirajHub landing page with content type grid + status board preview
- [x] Verified `pnpm dev` starts in 2.8s, zero TypeScript errors

### 1.5 — CI/CD Pipeline

- [x] `.github/workflows/deploy.yml` — on push to `main`: `pnpm install` → `pnpm build` → `wrangler deploy` → D1 migrations
- [x] Add Cloudflare API token + Account ID as GitHub Actions secrets (`CF_API_TOKEN`, `CF_ACCOUNT_ID`) — **you must do this**
- [x] Test with a dummy push — **do after secrets are set**

**Phase 1 complete when:** `pnpm dev` starts, browser shows "SirajHub", `/api/health` returns `{ ok: true }`, D1 tables exist locally. ✅

---

## Phase 2 — Auth ✅ COMPLETE

> Goal: Login page protecting the entire app. One user registers, everything else requires a session cookie.

### 2.1 — Better Auth Setup

- [x] Install `better-auth` in `worker/` and `apps/web/`
- [x] `worker/src/auth.ts` — configure Better Auth with D1 (Drizzle adapter), email/password provider only
- [x] Add `AUTH_SECRET` env var (random 32-char string) as a Wrangler secret (`.dev.vars` locally, `wrangler secret put` for prod)
- [x] Mount Better Auth handler in `worker/src/index.ts` at `/api/auth/*`
- [x] Add `account` and `verification` tables to schema + migration `0001_stale_ogun.sql`

### 2.2 — Session Middleware

- [x] `worker/src/middleware/auth.ts` — Hono middleware that reads the session cookie, validates via Better Auth, and injects `user_id` into `c.set('userId', ...)`
- [x] Applied middleware to all `/api/*` routes (registered after `/api/auth/*` handler so auth routes are exempt)
- [x] Returns `401` with `{ error: 'Unauthorized' }` if no valid session

### 2.3 — Login UI

- [x] `apps/web/src/routes/login.tsx` — centered card with email + password form, sign-in / sign-up toggle
- [x] TanStack Router redirect: unauthenticated users → `/login`, authenticated → `/`
- [x] `apps/web/src/lib/auth-client.ts` — Better Auth client (uses `/api/auth` base path)
- [x] Login and register wired to Better Auth client `signIn.email()` / `signUp.email()`
- [x] On success: invalidate router cache, redirect to `/`
- [x] Logout button in top-right nav calls `authClient.signOut()` → redirect to `/login`

**Note:** `pnpm db:migrate:local` must use `--persist-to ./apps/web/.wrangler/state` because `@cloudflare/vite-plugin` stores its D1 state under `apps/web/.wrangler/` (not the project root). This is already set in the root `package.json`.

**Phase 2 complete when:** Unauthenticated browser redirects to `/login`. After logging in, `/` is accessible. Refreshing keeps the session. Logout clears it. ✅

---

## Phase 3 — Core CRUD ✅ COMPLETE

> Goal: Manually add items, see them in a Board view, drag between status columns. No auto-fetch yet.

### 3.1 — Items API Routes

- [x] `worker/src/routes/items.ts`:
  - `GET /api/items` — list all items for current user (filter by `status`, `content_type` query params)
  - `POST /api/items` — create item (manual add, all fields provided by client)
  - `PATCH /api/items/:id` — update item (status, rating, notes, position, any field)
  - `DELETE /api/items/:id` — hard delete
- [x] All routes filter by `user_id` from middleware context
- [x] `AppType` exported from `worker/src/index.ts`

### 3.2 — API Client + Query Hooks

- [x] `apps/web/src/lib/api.ts` — typed `Item` interface + `itemsApi` fetch helpers (list/create/update/delete)
- [x] `apps/web/src/lib/constants.ts` — shared `CONTENT_TYPES` and `STATUSES` arrays
- [x] `apps/web/src/hooks/useItems.ts` — TanStack Query hooks: `useItems(filters)`, `useCreateItem()`, `useUpdateItem()`, `useDeleteItem()`

### 3.3 — App Shell

- [x] `apps/web/src/routes/__root.tsx` — persistent layout: top nav with "+ Add Item" button, logo, user menu (logout)
- [x] `AddItemDialog` state and render mounted in `__root.tsx` so it's accessible from any page

### 3.4 — Board View (Kanban)

- [x] `apps/web/src/components/BoardView.tsx` — 4 columns: Suggestions / In Progress / Finished / Archived
- [x] Each column renders a vertical list of `ItemCard` components
- [x] `@dnd-kit/core` + `@dnd-kit/sortable` + `@dnd-kit/utilities` installed
- [x] Drag cards between columns → `PATCH /api/items/:id` with new `status`; `DragOverlay` for smooth visual
- [x] Column headers show item count badge; `isOver` highlight when dragging over a column

### 3.5 — Item Card

- [x] `apps/web/src/components/ItemCard.tsx`:
  - Cover image (poster/thumbnail) — fallback to content-type icon
  - Title + creator line
  - Content type badge (colored per type)
  - Star rating display
  - 3-dot dropdown menu: Archive, Delete (with confirm dialog)
  - `onPointerDown` stopPropagation on menu button to prevent drag interference

### 3.6 — Manual Add Item Dialog

- [x] `apps/web/src/components/AddItemDialog.tsx` — triggered by "Add Item" nav button
- [x] Form fields: Title (required), Content Type (select), Status (select, default: Suggestions), Creator, Description, Cover URL, Release Date, Rating (1–5), Notes, Source URL
- [x] Submit → `POST /api/items` → close dialog → reset form → invalidate items query

**Phase 3 complete when:** Items can be manually added, appear on the Board, and can be dragged between columns. All changes persist in D1. ✅

---

## Phase 4 — Ingest Pipeline ✅ COMPLETE

> Goal: Paste a URL or type a title → metadata auto-populated. Manual add form becomes a fallback.

### 4.1 — Ingest API Route

- [x] `worker/src/routes/ingest.ts`:
  - `POST /api/ingest` — accepts `{ url?, query?, content_type? }`
  - Detects content type from URL pattern (or uses provided `content_type`)
  - Calls the appropriate metadata fetcher
  - Caches result in `url_cache` table with upsert (skip fetch if < 24h old)
  - Returns normalised `FetchedMetadata` object (same shape for all types)

### 4.2 — URL Dispatcher

- [x] `worker/src/services/metadata/index.ts` — pattern matching:
  - `youtube.com/watch` or `youtu.be` → YouTube fetcher
  - `goodreads.com`, `openlibrary.org`, `google.com/books` → Books fetcher
  - `themoviedb.org/movie` or `content_type=movie` → TMDB fetcher
  - `themoviedb.org/tv` or `content_type=tv` → TMDB fetcher
  - `podcasts.apple.com`, `anchor.fm`, etc. → Podcast fetcher
  - `twitter.com/.../status/` or `x.com/.../status/` → Tweet fetcher
  - Everything else → Article OG scraper

### 4.3 — YouTube Fetcher

- [x] `worker/src/services/metadata/youtube.ts`
- [x] Parses video ID from `?v=`, `youtu.be/`, and `/embed/` URL patterns
- [x] Calls YouTube Data API v3 `videos.list?part=snippet,contentDetails`
- [x] Parses ISO 8601 duration (PT1H23M45S) into minutes
- [x] Returns: title, channel name, description, thumbnail URL, duration, published date

### 4.4 — TMDB Fetcher (Movies + TV)

- [x] `worker/src/services/metadata/movies.ts`
- [x] Extracts TMDB ID from URL or searches by title via `/3/search/{type}`
- [x] Detail endpoint: `/3/movie/ID` or `/3/tv/ID` for full metadata
- [x] Returns: title, overview, poster URL, release date, genres, runtime/seasons, TMDB rating

### 4.5 — Books Fetcher

- [x] `worker/src/services/metadata/books.ts`
- [x] Primary: Open Library search (no API key) with cover image from covers.openlibrary.org
- [x] Fallback: Google Books API with full volume details
- [x] Returns: title, authors, description, cover URL, publish year, ISBN

### 4.6 — Podcast Fetcher

- [x] `worker/src/services/metadata/podcasts.ts`
- [x] Primary: iTunes Search API (no auth, JSON)
- [x] Fallback: Podcast Index API with SHA-1 auth (Web Crypto API, no external libs)
- [x] Returns: show title, author, artwork URL, episode count, feed URL, genre

### 4.7 — Article OG Scraper

- [x] `worker/src/services/metadata/articles.ts`
- [x] Uses Cloudflare `HTMLRewriter` (streaming HTML parser built into Workers)
- [x] Parses: `og:title`, `og:description`, `og:image`, `og:site_name`, `article:author`, `article:published_time`, `<title>` and `meta[name=description]` fallbacks
- [x] Returns normalised metadata

### 4.8 — Tweet Fetcher

- [x] `worker/src/services/metadata/tweets.ts`
- [x] Calls `https://publish.twitter.com/oembed`
- [x] Strips HTML tags from embed to produce plain-text description
- [x] Returns: author name, tweet text, embed HTML (in metadata JSON), date

### 4.9 — Add Item Dialog — URL Mode

- [x] `AddItemDialog.tsx` updated with three modes: "Paste URL", "Search by name", "Manual"
- [x] URL / search → calls `POST /api/ingest`, shows "Fetching…" state
- [x] Pre-populates all form fields from returned metadata (user can edit before saving)
- [x] Cover image preview rendered alongside the title field when a cover URL is fetched
- [x] "Skip — fill in manually" link always available

**Phase 4 complete when:** Pasting a YouTube URL, TMDB movie URL, book title, or article URL auto-fills title, cover, description, and creator. Metadata is cached — second fetch of same URL is instant. ✅

---

## Phase 5 — AI Features ✅ COMPLETE

> Goal: Auto-categorize on add, on-demand AI summary per item, and a "next to consume" ranked list.

### 5.1 — Gemini Service

- [x] `worker/src/services/ai.ts`:
  - `callGemini(apiKey, prompt, responseSchema)` — generic Gemini call with structured JSON output (uses `responseMimeType: "application/json"` + `responseSchema`)
  - `categorizeItem(apiKey, item)` — lightweight call: given title + description + URL domain, returns `content_type`, `confidence`, `suggested_tags`, `suggested_status`
  - `analyzeItem(apiKey, item)` — content-type-aware analysis: returns `summary`, `key_points[]`, `recommendation`, and optional `mood`
  - `rankNextList(apiKey, suggestions, preferences)` — ranks all suggestion-status items best-first with per-item reasoning
- [x] Model: `gemini-2.0-flash-lite` (free tier, 1,000 req/day)
- [x] `GEMINI_API_KEY` already defined in `Env` type; set via `wrangler secret put GEMINI_API_KEY`

### 5.2 — Auto-Categorize Utility

- [x] `categorizeItem()` implemented and ready in `services/ai.ts`
- [x] Returns `{ content_type, confidence, suggested_tags, suggested_status }`
- [x] Available to wire into any flow (manual add, bulk re-categorize, etc.)
- Note: Not wired into the items POST route automatically — users always select type in the dialog, so the marginal value over ingest detection was low. Wired in Phase 6 alongside the tags system it feeds.

### 5.3 — AI Route (`worker/src/routes/ai.ts`)

- [x] `POST /api/ai/analyze/:id` — on-demand analysis for a single item:
  - Checks `ai_cache` first: returns cached if entry is < 7 days old AND item hasn't been updated since cache was written (`item.updatedAt <= cached.createdAt`)
  - Calls `analyzeItem()`, stores result in `ai_cache` (insert or update), returns `{ cached: boolean, result }`
- [x] `GET /api/ai/next` — ranked "next to consume" list:
  - Checks KV cache first (`next_list:v1:{userId}` key); returns if found
  - Fetches all `status = 'suggestions'` items + user's `preferences` string from D1
  - Calls `rankNextList()`, caches ranked result in KV for 6 hours
  - Pass `?refresh=1` to bypass KV cache and force a fresh Gemini ranking
- [x] Route mounted in `worker/src/index.ts` at `/api/ai`

### 5.4 — AI Hooks + API Client

- [x] `apps/web/src/lib/api.ts` — `aiApi` with `analyze(itemId)` and `getNextList(refresh?)`
- [x] `apps/web/src/hooks/useAI.ts`:
  - `useAnalyzeItem()` — TanStack Query mutation that calls `POST /api/ai/analyze/:id`
  - `useNextList()` — query (disabled by default, fetched on demand)
  - `useRefreshNextList()` — mutation that calls `getNextList(true)` and pushes result into the query cache

### 5.5 — Item Card AI Integration

- [x] `apps/web/src/components/ItemCard.tsx` updated:
  - "Analyze" option added to the 3-dot dropdown menu
  - Clicking "Analyze" fires `useAnalyzeItem`, shows "Analyzing…" inline
  - Result expands as a panel directly on the card: mood badge, summary paragraph, key points list, recommendation in italics
  - "Close" link collapses the panel
  - `onPointerDown: stopPropagation` on all AI panel elements (prevents @dnd-kit drag interference)

### 5.6 — "Next to Consume" Panel

- [x] `apps/web/src/components/NextListPanel.tsx` — modal panel triggered from the nav bar:
  - "✨ Next to Consume" button with suggestion count badge
  - On open, fires `useNextList()` if not already fetched
  - Shows ranked list sorted by `rank` with cover thumbnail, title, creator, and Gemini's reasoning per item
  - "Refresh" button calls `useRefreshNextList()` (bypasses 6h KV cache, gets fresh ranking)
  - "Cached result" note shown when data came from KV
- [x] Button added to nav bar in `apps/web/src/routes/__root.tsx`

**Phase 5 complete when:** Clicking "Analyze" on any item returns a Gemini summary inline on the card. The "Next to Consume" nav button shows a ranked watchlist from Suggestions with reasoning. ✅

---

## Phase 6 — Polish & Search ✅ COMPLETE

> Goal: Grid view, tags, search, filter, settings, responsive mobile.

### 6.1 — Grid View

- [x] `apps/web/src/components/GridView.tsx` — CSS `columns` masonry layout
- [x] Flat layout with content-type filter pills above the view (toggleable; same filter bar used by Board)
- [x] Same `ItemCard` component used in Board view
- [x] View toggle (Board / Grid) persists to `localStorage`

### 6.2 — Tags System

- [x] `worker/src/routes/tags.ts` — `GET/POST/DELETE /api/tags` + `GET/POST/DELETE /api/tags/item/:itemId` and `/api/tags/item/:itemId/:tagId` for per-item assignment
- [x] `apps/web/src/hooks/useTags.ts` — `useTags`, `useItemTags`, `useCreateTag`, `useDeleteTag`, `useAddTagToItem`, `useRemoveTagFromItem`, `TAG_COLORS` palette
- [x] Tags managed in `ItemDetailPanel`: existing tag pills with × remove, picker for existing tags, inline "create new tag" with color picker
- [x] Tag filter row above the board/grid: clicking a tag pill filters all views to that tag
- [x] Tag pills shown on `ItemCard` (up to 3, then "+N more")
- [x] Tag manager in Settings page: see all tags, delete any (cascades to item_tags via FK)
- Note: AI-suggested tags deferred — the `categorizeItem()` utility is built; wiring it to a "Suggest tags" button in the panel is a follow-up

### 6.3 — Search

- [x] `apps/web/src/components/SearchCommand.tsx` — Cmd+K / Ctrl+K palette dialog
- [x] Instant client-side search over TanStack Query cache (title, creator, description) — no API call for most queries
- [x] `GET /api/items?q=QUERY` added as worker-side LIKE fallback (both `title` and `creator` columns)
- [x] Results grouped by content type with cover thumbnails and status badges

### 6.4 — Settings Page

- [x] `apps/web/src/routes/settings.tsx` (full page at `/settings`, linked from nav ⚙ button)
- [x] **Profile:** display name (editable + save), email (read-only)
- [x] **AI Preferences:** freetext taste profile saved to `user.preferences` in D1 — fed directly to `rankNextList()`
- [x] **Tags:** view and delete all user tags from one place
- [x] **Data:** Export all items as JSON download (`GET /api/user/export`) · Clear AI cache (`DELETE /api/user/ai-cache`, also purges KV next-list entry)
- Note: In-app API key management skipped — secrets are set once via `wrangler secret put` and never need a UI

### 6.5 — Responsive Mobile

- [x] Board view: `minmax(200px, 1fr)` grid + `overflowX: auto` — columns scroll horizontally on narrow screens
- [x] Grid view: `column-count` drops from 4 → 3 → 2 → 1 across `1100px / 720px / 480px` breakpoints via `.grid-view` CSS class
- [x] Top nav: search bar + Next/Add/Settings/Logout collapse behind a hamburger (`☰`) on mobile (`< sm`); mobile dropdown menu with full actions
- [x] Add Item dialog already modal-based — works fine on mobile without a bottom sheet

### 6.6 — Final Deployment

- [ ] Run `wrangler d1 migrations apply sirajhub-db --remote` (production D1)
- [ ] Set all secrets: `wrangler secret put GEMINI_API_KEY` · `TMDB_API_KEY` · `YOUTUBE_API_KEY` · `GOOGLE_BOOKS_API_KEY` · `PODCAST_INDEX_KEY` · `PODCAST_INDEX_SECRET` · `AUTH_SECRET`
- [ ] `wrangler deploy` → verify live Worker URL
- [ ] Add custom domain in Cloudflare Dashboard → Workers & Pages → your worker → Custom Domains
- [ ] Smoke test: add one item of each type, verify AI analysis, verify drag-drop, verify search, verify settings save

**Phase 6 complete when:** All views work on mobile. Search works. Tags filter correctly. Settings save. App is live at your custom domain. ✅ (code complete — deployment is a manual step)

---

## Summary Table

| Phase               | Goal                                                      | Estimated Files |
| ------------------- | --------------------------------------------------------- | --------------- |
| 1 — Foundation ✅   | Monorepo, Worker skeleton, D1 schema, React scaffold, CI  | 28 files — done |
| 2 — Auth ✅         | Better Auth, login page, session middleware               | ~8 files — done |
| 3 — Core CRUD ✅    | Items API, Board view, ItemCard, Add dialog               | ~10 files — done |
| 4 — Ingest Pipeline ✅ | URL dispatcher + 6 fetchers, caching                   | ~10 files — done |
| 5 — AI Features ✅  | Gemini service, item analysis, next list panel            | ~6 files — done |
| 6 — Polish ✅       | Grid, tags, search, settings, mobile, deploy              | ~12 files — done |
