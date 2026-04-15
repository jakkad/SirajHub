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

## Phase 7 — Deferred Requirements

> Goal: Close the gap between PLAN_V1.md and the implemented code. Four features were explicitly deferred across Phases 5 and 6, plus the auto-timestamping that the schema was built for but never wired up.

### 7.1 — Within-Column Drag Reordering ✅

`@dnd-kit/sortable` and the `position INTEGER` column were scaffolded in Phases 3 and 6 but only cross-column dragging (status changes) was wired. Within-column reordering is needed to let users manually rank items inside a status column.

- [x] Wrap each column's item list in `SortableContext` (using `verticalListSortingStrategy`)
- [x] Replace raw `useDraggable` on `ItemCard` with `useSortable` so items can be reordered within a column
- [x] In `onDragEnd`: when `sourceColumn === destColumn`, use `arrayMove` to compute new order, normalise all positions to `index * 1000`, batch-PATCH only changed ones, then invalidate query cache
- [x] `GET /api/items` already orders by `position` then `createdAt` — sort is stable after a reorder

### 7.2 — Auto-Categorize on Add ✅

`categorizeItem()` in `services/ai.ts` returns `{ content_type, confidence, suggested_tags, suggested_status }` and has been ready since Phase 5. It was meant to fire on every new item but was deferred twice.

- [x] Add `POST /api/ai/categorize` route in `worker/src/routes/ai.ts` — calls `categorizeItem()`, returns result directly (no caching needed for this fast call)
- [x] `CategorizeResult` interface + `aiApi.categorize()` added to `apps/web/src/lib/api.ts`
- [x] `useCategorizeItem()` hook added to `apps/web/src/hooks/useAI.ts`
- [x] In `AddItemDialog`: after ingest fetch `onSuccess`, fires `categorize()` in the background; if AI confidence > 0.7 and suggested type differs from fetched type, shows a clickable "AI suggests: [Type] →" chip next to the Type select; clicking the chip switches the type; chip is cleared when user manually changes the type

### 7.3 — AI "Suggest Tags" in Item Detail ✅

Tags were fully built in Phase 6, but the `categorizeItem()` → `suggested_tags` path was never wired to a user-facing action. This closes the loop between the AI and the tags system.

- [x] "✨ Suggest" button added to `ItemDetailPanel` next to the "+ Add tag" button
- [x] On click: calls `POST /api/ai/categorize` with the item's title + description + sourceUrl + contentType
- [x] Renders each suggested tag as a clickable "+ [name]" chip; tags already applied to the item are filtered out
- [x] Clicking a chip: adds an existing tag with the same name (case-insensitive), or creates + assigns a new one with a random color
- [x] Shows "…" loading state while AI call is in flight; shows "No tag suggestions" when Gemini returns an empty array

### 7.4 — Auto-Timestamp on Status Transition ✅

The `started_at` and `finished_at` columns exist in the `items` schema and are surfaced in the UI, but the PATCH handler never auto-populates them when status changes.

- [x] PATCH handler now selects `status`, `startedAt`, `finishedAt` from the existing row (was only selecting `id`)
- [x] When status transitions to `"in_progress"` and `startedAt` is NULL: auto-sets `startedAt = now`
- [x] When status transitions to `"finished"` and `finishedAt` is NULL: auto-sets `finishedAt = now`
- [x] Does not overwrite if caller explicitly provides `startedAt`/`finishedAt` in the request body
- [x] Timestamps not cleared on backwards transitions (preserves history)
- [x] `ItemDetailPanel` displays "Started [date]" and "Finished [date]" in the timestamps row when non-null

### 7.5 — Final Deployment

(Carried over from Phase 6.6 — these are manual steps only Jake can run.)

- [ ] Run `wrangler d1 migrations apply sirajhub-db --remote` (production D1)
- [ ] Set all secrets: `wrangler secret put GEMINI_API_KEY` · `TMDB_API_KEY` · `YOUTUBE_API_KEY` · `GOOGLE_BOOKS_API_KEY` · `PODCAST_INDEX_KEY` · `PODCAST_INDEX_SECRET` · `AUTH_SECRET`
- [ ] `wrangler deploy` → verify live Worker URL
- [ ] Add custom domain in Cloudflare Dashboard → Workers & Pages → your worker → Custom Domains
- [ ] Smoke test: add one item of each type, verify AI analysis, verify drag-drop, verify search, verify settings save

**Phase 7 complete when:** Items can be reordered within a column. Adding an item via URL/search pre-fills the content type from AI. The item detail panel has a working "Suggest tags" button. Status changes to In Progress and Finished auto-record their timestamps. App is live at the custom domain. ✅ (code complete — deployment is a manual step)

---

## V1 Summary Table

| Phase               | Goal                                                      | Estimated Files |
| ------------------- | --------------------------------------------------------- | --------------- |
| 1 — Foundation ✅   | Monorepo, Worker skeleton, D1 schema, React scaffold, CI  | 28 files — done |
| 2 — Auth ✅         | Better Auth, login page, session middleware               | ~8 files — done |
| 3 — Core CRUD ✅    | Items API, Board view, ItemCard, Add dialog               | ~10 files — done |
| 4 — Ingest Pipeline ✅ | URL dispatcher + 6 fetchers, caching                   | ~10 files — done |
| 5 — AI Features ✅  | Gemini service, item analysis, next list panel            | ~6 files — done |
| 6 — Polish ✅       | Grid, tags, search, settings, mobile, deploy              | ~12 files — done |
| 7 — Deferred Requirements ✅ | Within-column sort, auto-categorize, suggest tags, timestamps, deploy | ~5 files — done |

---

---

# V2 — Full Frontend Redesign

> **Motivation:** V1 shipped a single-page Kanban/grid with no per-media identity. V2 replaces it with a purpose-built design: dedicated pages per media type rendered in an artistically appropriate way, a proper dashboard, a full-page item detail view, shadcn/ui as the component foundation, and per-user API key management in settings.

---

## V2 Phase 1 — shadcn/ui Setup

> Goal: Install shadcn without breaking the existing UI. No functional changes yet.

- [ ] Add `@/*` path alias to `apps/web/tsconfig.app.json` (`baseUrl: "."`, `paths: { "@/*": ["./src/*"] }`)
- [ ] Add `resolve.alias` to `apps/web/vite.config.ts` (`"@" → "./src"`)
- [ ] Install deps: `pnpm --filter web add clsx tailwind-merge lucide-react` + `pnpm --filter web add -D @types/node`
- [ ] Create `apps/web/src/lib/utils.ts` with `cn()` helper (`clsx` + `twMerge`)
- [ ] Create `apps/web/components.json` (style: `new-york`, baseColor: `zinc`, css: `src/index.css`)
- [ ] Add shadcn HSL bridge tokens to `apps/web/src/index.css` in `@layer base` — maps existing OKLCH palette to shadcn `--background`, `--foreground`, `--card`, `--primary`, `--border`, `--ring` etc. Keep existing `var(--color-*)` OKLCH tokens intact.
- [ ] Fix sidebar CSS token conflict: override shadcn's default light-mode sidebar vars with dark palette values
- [ ] Run: `npx shadcn@latest add button badge tooltip sheet sidebar dialog tabs card separator scroll-area select radio-group input textarea label avatar dropdown-menu`

**Complete when:** `pnpm build` passes with zero errors and the existing UI renders identically.

---

## V2 Phase 2 — Navigation: Sidebar + Topbar

> Goal: Replace the sticky top header with a collapsible sidebar + slim topbar.

### `apps/web/src/routes/__root.tsx` — full rewrite
Two-column layout: `<AppSidebar /> + <div flex-1><AppTopbar /><Outlet /></div>`. Keep all existing state (addItemOpen, searchOpen, searchSelectedItem) and all existing overlay components (AddItemDialog, SearchCommand, ItemDetailPanel).

### Create `apps/web/src/components/AppSidebar.tsx`
shadcn `Sidebar` + `SidebarProvider`. Nav items with `lucide-react` icons and per-type color dots:

| Label     | Route      | Icon              | Color var             |
|-----------|------------|-------------------|-----------------------|
| Dashboard | `/`        | `LayoutDashboard` | —                     |
| Books     | `/books`   | `BookOpen`        | `var(--color-book)`   |
| Movies    | `/movies`  | `Film`            | `var(--color-movie)`  |
| TV Shows  | `/tv`      | `Tv`              | `var(--color-tv)`     |
| Podcasts  | `/podcasts`| `Mic`             | `var(--color-podcast)`|
| Videos    | `/videos`  | `Play`            | `var(--color-youtube)`|
| Articles  | `/articles`| `FileText`        | `var(--color-article)`|
| Tweets    | `/tweets`  | `MessageSquare`   | `var(--color-tweet)`  |
| Settings  | `/settings`| `Settings`        | —                     |

Active state: accent tint background. Mobile: sidebar renders as a `Sheet` drawer, triggered by topbar hamburger.

### Create `apps/web/src/components/AppTopbar.tsx`
Slim bar (h-14): hamburger (mobile only) → search button (Cmd+K) → `+ Add` → user avatar `DropdownMenu` (Settings, Log out).

**Complete when:** Sidebar visible on all routes, mobile drawer works, existing routes `/`, `/settings`, `/login` still render.

---

## V2 Phase 3 — Backend: Per-User API Keys & Model Selection

> Goal: Let users store their own API keys and choose their AI model via Settings.

### Schema change — `worker/src/db/schema.ts`
Add to `user` table:
```ts
apiKeys: text("api_keys"),
// JSON shape: { gemini?, tmdb?, youtube?, googleBooks?, podcastIndexKey?, podcastIndexSecret?, aiModel? }
```

### Create `worker/src/db/migrations/0002_user_api_keys.sql`
```sql
ALTER TABLE `user` ADD `api_keys` text;
```
Run: `wrangler d1 migrations apply sirajhub-db --local` (and `--remote` for prod)

### New API endpoints — `worker/src/routes/user.ts`
- `GET /api/user/settings` → returns `{ gemini: "set"|null, tmdb: "set"|null, ... }` — **never returns raw key values**
- `PATCH /api/user/settings` → body `{ service: string, key: string }`, merges into `apiKeys` JSON column

### Key resolution helper — `worker/src/routes/ai.ts` + `ingest.ts`
```ts
async function resolveGeminiKey(c): Promise<string> {
  // Read user.apiKeys JSON, return keys.gemini if set
  // Fall back to c.env.GEMINI_API_KEY
}
```
Apply same pattern for TMDB, YouTube, Books, Podcast keys in `ingest.ts`.

### Model resolution — `worker/src/services/ai.ts`
Change `callGemini(apiKey, prompt, schema)` → `callGemini(apiKey, model, prompt, schema)`. Resolve model from `apiKeys.aiModel` in each AI route handler, defaulting to `"gemini-2.5-flash"`.

### Frontend additions
- `apps/web/src/lib/api.ts` — add `userSettingsApi.getSettings()` and `userSettingsApi.updateKey(service, key)`
- `apps/web/src/hooks/useUser.ts` — add `useUserSettings()` and `useUpdateApiKey()` hooks

**Complete when:** Saving a Gemini key in Settings causes AI calls to use it instead of the env secret.

---

## V2 Phase 4 — Expanded Settings Page

> Goal: Full settings page with tabs for profile, API keys, AI model, tags, and data.

### `apps/web/src/routes/settings.tsx` — restructure with shadcn `Tabs`

**Tabs:**
```
[Profile]  [API Keys]  [AI Model]  [Tags]  [Data]
```

**Profile tab** (existing content, minimal changes)
- Display name (editable), email (read-only), AI taste preferences textarea

**API Keys tab** (new)
- One row per service: label | masked input | Save button | Test button
- Services: Gemini, TMDB, YouTube, Google Books, Podcast Index Key, Podcast Index Secret
- Saved keys render `••••••••` — input shows placeholder "Enter key to update"
- Save calls `useUpdateApiKey(service, value)`

**AI Model tab** (new)
- `RadioGroup` with options: `gemini-2.5-flash` (default, recommended), `gemini-2.0-flash-lite` (fast/free), `gemini-2.5-pro` (best quality)
- Each option shows name + short description
- Saves to `apiKeys.aiModel` via `useUpdateApiKey("aiModel", model)`

**Tags tab** (moved from current settings)
**Data tab** (moved from current settings — export + clear AI cache)

**Complete when:** API keys can be saved and masked in settings. Model selection persists and is used by AI calls.

---

## V2 Phase 5 — Dashboard (`/`)

> Goal: Replace the single board/grid page with a useful at-a-glance dashboard.

### `apps/web/src/routes/index.tsx` — full replacement

Layout:
```
[TypeStats — 7 colored tiles]
[InProgress — horizontal scroll row]
[2-col: RecentlyAdded | NextToConsume]
```

### Create `apps/web/src/components/dashboard/TypeStats.tsx`
7 shadcn `Card` tiles in a responsive grid. Each: colored icon + type label + total item count. Click navigates to that type's route. Data from `useItems()` filtered client-side.

### Create `apps/web/src/components/dashboard/RecentlyAdded.tsx`
Last 8 items by `createdAt` desc. Horizontal scroll row of small cards: cover thumbnail + title + type badge. Click opens `/item/:id`.

### Create `apps/web/src/components/dashboard/InProgressItems.tsx`
All `status === "in_progress"` items. Compact card list: cover + title + creator + elapsed time since `startedAt`. Click opens `/item/:id`.

### Create `apps/web/src/components/dashboard/NextToConsume.tsx`
Inline version of `NextListPanel` — no modal wrapper. Renders the AI-ranked suggestions list directly. Reuses `useNextList()` hook. "Refresh" button included.

**Complete when:** Dashboard loads with real data, all 4 widgets render, type stat tiles navigate correctly.

---

## V2 Phase 6 — Item Detail Page (`/item/$id`)

> Goal: Full-page item view with inline editing and AI actions. Replaces the slide-over for direct navigation.

### Create `apps/web/src/routes/item.$id.tsx`
TanStack Router dynamic route. Reads `id` param, finds item in `useItems()` cache.

**Two-column layout:**
- **Left:** Large cover image + core metadata display (title, creator, release date, duration, status badge, star rating, source link)
- **Right:** Inline edit form + AI panel + tags + notes

**Inline editing:** Click-to-edit on all fields. Blur triggers `useUpdateItem()`. Status via shadcn `Select`. Date pickers via `<input type="date">`. Rating via star buttons.

**Back navigation:** `window.history.back()` button, shows "← Back to [type]" label.

### Create `apps/web/src/components/AIPanel.tsx`
Reusable panel (used by both the detail page and `ItemDetailPanel` slide-over):
- "Analyze" button → `useAnalyzeItem(id)` → renders summary, key points, mood badge, recommendation
- "Suggest Tags" button → `useCategorizeItem()` → renders addable tag chips

### Create `apps/web/src/components/InlineTagManager.tsx`
Extract tag management from `ItemDetailPanel` into a standalone component used by both the detail page and the slide-over.

**Complete when:** `/item/:id` opens with all data, fields are editable and auto-save, AI panel works, back nav returns to correct type page.

---

## V2 Phase 7 — Per-Type Artistic Views

> Goal: One dedicated page per media type, each rendered in a visually appropriate style.

All views use `useItems({ content_type: X })`. Status filter tabs at top (shadcn `Tabs` or pills: All / Suggestions / In Progress / Finished / Archived). Cards link to `/item/${item.id}`.

### `apps/web/src/routes/articles.tsx` + `components/views/ArticleList.tsx`
Text-first reading list. Each row: domain favicon pill | bold title | creator | date | reading time (`durationMins`). Grouped by status.

### `apps/web/src/routes/tweets.tsx` + `components/views/TweetFeed.tsx`
Single-column centered feed (max-w-[600px]). Card per tweet: avatar circle + author name | tweet text (`description`) | date | external link.

### `apps/web/src/routes/podcasts.tsx` + `components/views/PodcastGrid.tsx`
Square album art tiles: `repeat(auto-fill, minmax(160px, 1fr))`. Hover overlay: episode count + publisher from `metadata` JSON.

### `apps/web/src/routes/videos.tsx` + `components/views/VideoGrid.tsx`
16:9 thumbnail tiles. Below: title (2-line clamp), channel name, duration. Hover: play button overlay.

### `apps/web/src/routes/movies.tsx` + `components/views/MoviePosterGrid.tsx`
Dense 2:3 poster grid: `repeat(auto-fill, minmax(140px, 1fr))`. Hover: dark overlay slides up with title + year + star rating. Fallback tile: colored gradient + emoji.

### `apps/web/src/routes/tv.tsx` + `components/views/TVPosterGrid.tsx`
Same as MoviePosterGrid + season count badge top-right (from `metadata.seasons`).

### `apps/web/src/routes/books.tsx` + `components/views/BookshelfView.tsx`
Three horizontal shelves (Suggestions / In Progress / Finished). Books as vertical spines:
- Spine: `width: 32px, height: 140px`, `writing-mode: vertical-rl`, rotated title text
- Hover: expands to show cover + tooltip
- Drag-to-reorder via dnd-kit `horizontalListSortingStrategy` (same drag logic as `BoardView.tsx`)
- Fallback spine color: hue variation on `var(--color-book)` derived from item ID

**Complete when:** All 7 type pages load with correct filtered data, artistic layouts render, all items link to detail page.

---

## V2 Files Changed

### Created (frontend)
```
apps/web/components.json
apps/web/src/lib/utils.ts
apps/web/src/components/ui/              ← shadcn generated
apps/web/src/components/AppSidebar.tsx
apps/web/src/components/AppTopbar.tsx
apps/web/src/components/AIPanel.tsx
apps/web/src/components/InlineTagManager.tsx
apps/web/src/components/dashboard/TypeStats.tsx
apps/web/src/components/dashboard/RecentlyAdded.tsx
apps/web/src/components/dashboard/InProgressItems.tsx
apps/web/src/components/dashboard/NextToConsume.tsx
apps/web/src/components/views/BookshelfView.tsx
apps/web/src/components/views/MoviePosterGrid.tsx
apps/web/src/components/views/TVPosterGrid.tsx
apps/web/src/components/views/PodcastGrid.tsx
apps/web/src/components/views/VideoGrid.tsx
apps/web/src/components/views/ArticleList.tsx
apps/web/src/components/views/TweetFeed.tsx
apps/web/src/routes/books.tsx
apps/web/src/routes/movies.tsx
apps/web/src/routes/tv.tsx
apps/web/src/routes/podcasts.tsx
apps/web/src/routes/videos.tsx
apps/web/src/routes/articles.tsx
apps/web/src/routes/tweets.tsx
apps/web/src/routes/item.$id.tsx
```

### Modified (frontend)
```
apps/web/tsconfig.app.json              ← @/* alias
apps/web/vite.config.ts                 ← resolve.alias
apps/web/src/index.css                  ← shadcn HSL bridge tokens
apps/web/src/routes/__root.tsx          ← sidebar + topbar layout
apps/web/src/routes/index.tsx           ← dashboard
apps/web/src/routes/settings.tsx        ← tabs + API keys + model
apps/web/src/lib/api.ts                 ← userSettingsApi
apps/web/src/hooks/useUser.ts           ← useUserSettings, useUpdateApiKey
```

### Created (backend)
```
worker/src/db/migrations/0002_user_api_keys.sql
```

### Modified (backend)
```
worker/src/db/schema.ts                 ← apiKeys column on user table
worker/src/routes/user.ts               ← GET/PATCH /api/user/settings
worker/src/routes/ai.ts                 ← per-user key + model resolution
worker/src/routes/ingest.ts             ← per-user TMDB/YouTube/Books/Podcast keys
worker/src/services/ai.ts              ← model param in callGemini()
```

---

## V2 Summary Table

| Phase | Goal | Status |
|-------|------|--------|
| V2–1 — shadcn Setup | Install component library, configure aliases, bridge tokens | ✅ Done |
| V2–2 — Navigation | Sidebar + topbar, replace sticky header | ✅ Done |
| V2–3 — Backend Keys | Per-user API keys + model in DB + endpoints | ✅ Done |
| V2–4 — Settings | Tabs: Profile / API Keys / AI Model / Tags / Data | ✅ Done |
| V2–5 — Dashboard | TypeStats, RecentlyAdded, InProgress, NextToConsume widgets | ✅ Done |
| V2–6 — Item Detail Page | `/item/$id` full-page view + inline edit + AI panel | ✅ Done |
| V2–7 — Artistic Views | 7 per-type pages: shelf, posters, grid, feed, list | ✅ Done |

---

# V2.1 — Visual System Refinement

> **Motivation:** The initial V2 redesign improved structure, but the first pass at the new look still felt visually off. V2.1 refines the interface into a softer analytics-style dashboard and then corrects the first-round issues discovered during review: an oversized sidebar header/footer and an unreadable squeezed stats area on the homepage.

## V2.1 Step 1 — Soft Analytics Theme Pass

> Goal: Replace the playful paper/marker treatment with a cleaner, premium, light-first dashboard system inspired by the reference.

- [x] Rebuild `apps/web/src/index.css` tokens around a light analytics palette:
  - neutral/light background
  - white card surfaces
  - pale blue / lilac accents
  - softer border + shadow system
  - modern sans typography
- [x] Retheme shared shadcn primitives:
  - `button`, `badge`, `card`, `input`, `textarea`
  - `tabs`, `select`, `dropdown-menu`
  - `dialog`, `sheet`, `sidebar`
- [x] Rewrite shell styling in `__root.tsx`, `AppSidebar.tsx`, and `AppTopbar.tsx`
- [x] Redesign key surfaces to match the new visual language:
  - dashboard
  - settings
  - add/search/next-list overlays
  - item cards and detail views
  - login page
  - AI panel + inline tag manager

**Complete when:** The app no longer uses the hand-drawn / chunky-border V2 look and instead renders as a soft light dashboard across signed-in screens and auth.

## V2.1 Step 2 — Review Fixes: Sidebar + Dashboard Stats

> Goal: Fix the layout regressions discovered immediately after the redesign.

### Sidebar correction
- [x] Remove the large descriptive block from the top sidebar card
- [x] Compress the branding header so navigation fits without unnecessary scrolling
- [x] Simplify the bottom workspace card and shorten the action label from "Workspace Preferences" to "Preferences"
- [x] Preserve the same routes and navigation behavior while reducing vertical footprint

### Dashboard correction
- [x] Remove the type stats grid from the narrow hero card
- [x] Create a dedicated full-width `Library Types` card below the hero row
- [x] Redesign each type stat into a wider horizontal tile with icon, label, count, and badge
- [x] Keep the hero focused on headline + summary instead of forcing both messaging and analytics into one cramped column

**Complete when:** Sidebar navigation fits comfortably on normal desktop heights, the workspace card is fully visible, and the homepage stats are readable at standard laptop widths.

## V2.1 Files Changed

### Modified
```text
apps/web/src/index.css
apps/web/src/routes/__root.tsx
apps/web/src/routes/index.tsx
apps/web/src/routes/login.tsx
apps/web/src/routes/settings.tsx
apps/web/src/routes/item.$id.tsx
apps/web/src/components/AppSidebar.tsx
apps/web/src/components/AppTopbar.tsx
apps/web/src/components/AIPanel.tsx
apps/web/src/components/InlineTagManager.tsx
apps/web/src/components/AddItemDialog.tsx
apps/web/src/components/SearchCommand.tsx
apps/web/src/components/NextListPanel.tsx
apps/web/src/components/ItemCard.tsx
apps/web/src/components/ItemDetailPanel.tsx
apps/web/src/components/dashboard/TypeStats.tsx
apps/web/src/components/dashboard/RecentlyAdded.tsx
apps/web/src/components/dashboard/InProgressItems.tsx
apps/web/src/components/dashboard/NextToConsume.tsx
apps/web/src/components/views/TypePageLayout.tsx
apps/web/src/components/ui/*
```

## V2.1 Summary Table

| Step | Goal | Status |
|------|------|--------|
| V2.1–1 — Theme Pass | Replace the first redesign with a soft analytics visual system | ✅ Done |
| V2.1–2 — Layout Fixes | Simplify sidebar and move/readjust squeezed dashboard stats | ✅ Done |

---

# V2.2 — Feature Optimization

> **Motivation:** V2 shipped a polished interface, but several product workflows still needed to become more durable and automation-friendly. V2.2 focuses on persisting AI outputs, improving search-based ingest, clarifying supported auto-detected sources, and turning AI work into a scheduled queue rather than one-off transient actions.

## V2.2 Step 1 — Saved Analysis Per Item

- [x] Keep `ai_cache` as the source of truth for the latest saved analysis result per item
- [x] Add a read endpoint for saved analysis so the UI can load the latest persisted result without regenerating it
- [x] Update the analysis action to save/refresh the latest result and expose saved metadata (`savedAt`, `modelUsed`, cached/queued state)
- [x] Show saved analysis by default in item AI surfaces and add an explicit refresh action

## V2.2 Step 2 — Top-5 External Search Suggestions

- [x] Add `POST /api/ingest/search` returning up to 5 suggestions for books, movies, TV shows, and podcasts
- [x] Add `POST /api/ingest/resolve` to turn a selected suggestion into normalized metadata for the add form
- [x] Keep direct URL ingest unchanged for auto-detected sources
- [x] Update Add Item search mode into a pick-first flow: search, review 5 suggestions, select one, then populate the form

## V2.2 Step 3 — Source Detection Tips

- [x] Add a shared frontend constant describing auto-detectable URL sources per content type, with examples
- [x] Show an inline helper block in Add Item URL mode listing supported source patterns
- [x] Show a compact helper note in search mode indicating which content types support top-5 external search

## V2.2 Step 4 — Persistent AI Queue

- [x] Add a D1-backed `ai_jobs` table and migration for queued AI work
- [x] Extend user settings with `aiQueueIntervalMinutes`, default `60`
- [x] Queue analysis refreshes and next-to-consume ranking instead of relying only on transient UI state
- [x] Add a Cloudflare scheduled handler and cron trigger in `wrangler.toml`
- [x] Persist completed queue results, retry transient failures with capped attempts, and surface queued/failed states in the UI
- [x] Add an AI Queue tasks section in Settings so users can review job progress and retry failed tasks

## V2.2 Files Changed

### Modified
```text
IMPLEMENTATION_PLAN.md
worker/src/db/schema.ts
worker/src/routes/ai.ts
worker/src/routes/ingest.ts
worker/src/routes/user.ts
worker/src/index.ts
worker/src/services/metadata/*
apps/web/src/lib/api.ts
apps/web/src/hooks/useAI.ts
apps/web/src/hooks/useItems.ts
apps/web/src/components/AddItemDialog.tsx
apps/web/src/components/AIPanel.tsx
apps/web/src/components/ItemCard.tsx
apps/web/src/components/NextListPanel.tsx
apps/web/src/components/dashboard/NextToConsume.tsx
apps/web/src/routes/settings.tsx
wrangler.toml
```

### Created
```text
worker/src/db/migrations/0003_ai_jobs.sql
worker/src/lib/user-settings.ts
worker/src/services/ai-queue.ts
```

## V2.2 Summary Table

| Step | Goal | Status |
|------|------|--------|
| V2.2–1 — Saved Analysis | Persist and reuse the latest AI analysis per item | ✅ Done |
| V2.2–2 — Search Suggestions | Return and resolve the top 5 external-source matches before adding | ✅ Done |
| V2.2–3 — Source Tips | Explain which URLs can be auto-detected, with examples | ✅ Done |
| V2.2–4 — AI Queue | Add scheduled, persistent AI jobs with a configurable interval | ✅ Done |
