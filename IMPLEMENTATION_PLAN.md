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

| Key | Where to Get It | Where It Will Go |
|---|---|---|
| `GEMINI_API_KEY` | aistudio.google.com → Get API Key | Cloudflare Worker secret |
| `TMDB_API_KEY` | themoviedb.org → Settings → API | Cloudflare Worker secret |
| `YOUTUBE_API_KEY` | Google Cloud Console → APIs & Services → Credentials → Create API Key → restrict to YouTube Data API v3 | Cloudflare Worker secret |
| `GOOGLE_BOOKS_API_KEY` | Same Google Cloud project → enable Books API → same or new API key | Cloudflare Worker secret |
| `PODCAST_INDEX_KEY` + `PODCAST_INDEX_SECRET` | api.podcastindex.org → register | Cloudflare Worker secret |

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
- [ ] Add Cloudflare API token + Account ID as GitHub Actions secrets (`CF_API_TOKEN`, `CF_ACCOUNT_ID`) — **you must do this**
- [ ] Test with a dummy push — **do after secrets are set**

**Phase 1 complete when:** `pnpm dev` starts, browser shows "SirajHub", `/api/health` returns `{ ok: true }`, D1 tables exist locally. ✅

---

## Phase 2 — Auth

> Goal: Login page protecting the entire app. One user registers, everything else requires a session cookie.

### 2.1 — Better Auth Setup
- [ ] Install `better-auth` in `worker/`
- [ ] `worker/src/auth.ts` — configure Better Auth with D1 adapter + KV session cache, email/password provider only
- [ ] Add `AUTH_SECRET` env var (random 32-char string) as a Wrangler secret
- [ ] Mount Better Auth handler in `worker/src/index.ts` at `/auth/*`

### 2.2 — Session Middleware
- [ ] `worker/src/middleware/auth.ts` — Hono middleware that reads the session cookie, validates via Better Auth, and injects `user_id` into `c.set('userId', ...)`
- [ ] Apply middleware to all `/api/*` routes (not `/auth/*`)
- [ ] Return `401` with `{ error: 'Unauthorized' }` if no valid session

### 2.3 — Login UI
- [ ] `apps/web/src/routes/login.tsx` — centered card with email + password form
- [ ] TanStack Router redirect: unauthenticated users → `/login`, authenticated → `/`
- [ ] `apps/web/src/lib/auth-client.ts` — Better Auth client configured with base URL
- [ ] Wire login form to Better Auth client `signIn.email()` method
- [ ] On success: invalidate router cache, redirect to `/`
- [ ] Add logout button to app shell (dropdown in top-right)

**Phase 2 complete when:** Unauthenticated browser redirects to `/login`. After logging in, `/` is accessible. Refreshing keeps the session. Logout clears it.

---

## Phase 3 — Core CRUD

> Goal: Manually add items, see them in a Board view, drag between status columns. No auto-fetch yet.

### 3.1 — Items API Routes
- [ ] `worker/src/routes/items.ts`:
  - `GET /api/items` — list all items for current user (filter by `status`, `content_type`, `tag` query params)
  - `POST /api/items` — create item (manual add, all fields provided by client)
  - `PATCH /api/items/:id` — update item (status, rating, notes, position, any field)
  - `DELETE /api/items/:id` — soft-delete (set `status = 'archived'`) or hard delete
- [ ] All routes filter by `user_id` from middleware context
- [ ] Export Hono app type from `worker/src/index.ts` for RPC client

### 3.2 — Hono RPC Client
- [ ] `apps/web/src/lib/api.ts` — `hc<AppType>(baseUrl)` typed client
- [ ] `apps/web/src/hooks/useItems.ts` — TanStack Query hooks: `useItems(filters)`, `useCreateItem()`, `useUpdateItem()`, `useDeleteItem()`

### 3.3 — App Shell
- [ ] `apps/web/src/routes/__root.tsx` — persistent layout: top nav bar + main content outlet
- [ ] Top nav: SirajHub logo, view toggle (Board / Grid), "Add Item" button, user menu (logout)
- [ ] Filter sidebar (collapsible): filter by content type chips, filter by status (for grid view)

### 3.4 — Board View (Kanban)
- [ ] `apps/web/src/components/BoardView.tsx` — 4 columns: Suggestions / In Progress / Finished / Archived
- [ ] Each column renders a vertical list of `ItemCard` components
- [ ] Install `@dnd-kit/core` + `@dnd-kit/sortable`
- [ ] Drag cards between columns → `PATCH /api/items/:id` with new `status` + recalculated `position`
- [ ] Column headers show item count badge

### 3.5 — Item Card
- [ ] `apps/web/src/components/ItemCard.tsx` — shadcn `Card` with:
  - Cover image (poster/thumbnail) — fallback to content-type icon
  - Title + creator line
  - Content type `Badge` (colored per type)
  - Status `Badge`
  - 3-dot `DropdownMenu`: Edit, Analyze (disabled for now), Archive, Delete
- [ ] Skeleton loading state while fetching

### 3.6 — Manual Add Item Dialog
- [ ] `apps/web/src/components/AddItemDialog.tsx` — shadcn `Dialog` triggered by "Add Item" button
- [ ] Form fields: Title (required), Content Type (select), Status (select, default: Suggestions), Creator, Description, Cover URL, Release Date, Rating, Notes
- [ ] Submit → `POST /api/items` → close dialog → invalidate items query → show success toast

**Phase 3 complete when:** Items can be manually added, appear on the Board, and can be dragged between columns. All changes persist in D1.

---

## Phase 4 — Ingest Pipeline

> Goal: Paste a URL or type a title → metadata auto-populated. Manual add form becomes a fallback.

### 4.1 — Ingest API Route
- [ ] `worker/src/routes/ingest.ts`:
  - `POST /api/ingest` — accepts `{ url?: string, query?: string, content_type?: string }`
  - Detects content type from URL pattern (or uses provided `content_type`)
  - Calls the appropriate metadata fetcher
  - Caches result in `url_cache` table (skip fetch if URL already cached and < 24h old)
  - Returns normalized metadata object (same shape for all types)

### 4.2 — URL Dispatcher
- [ ] `worker/src/services/metadata/index.ts` — pattern matching:
  - `youtube.com/watch` or `youtu.be` → YouTube fetcher
  - `amazon.com/.*book` or `goodreads.com` or bare ISBN → Books fetcher
  - `themoviedb.org` or manual type=movie/tv → TMDB fetcher
  - Podcast RSS URLs (`.xml`, `feeds.`) → Podcast fetcher
  - `twitter.com` or `x.com` → Tweet fetcher
  - Everything else → Article OG scraper

### 4.3 — YouTube Fetcher
- [ ] `worker/src/services/metadata/youtube.ts`
- [ ] Parse video ID from URL (`?v=` param or `youtu.be/` path)
- [ ] Call YouTube Data API v3 `videos.list?part=snippet,contentDetails&id=VIDEO_ID`
- [ ] Return: title, channel name, description, thumbnail URL, duration, published date

### 4.4 — TMDB Fetcher (Movies + TV)
- [ ] `worker/src/services/metadata/movies.ts`
- [ ] Search endpoint: `/3/search/multi?query=TITLE` (handles both movie and TV)
- [ ] Detail endpoint: `/3/movie/ID` or `/3/tv/ID` for full metadata
- [ ] Return: title, tagline, overview, poster URL, release date, genres, runtime/seasons, rating

### 4.5 — Books Fetcher
- [ ] `worker/src/services/metadata/books.ts`
- [ ] Primary: Open Library `/api/books?bibkeys=ISBN:&format=json&jscmd=data` (no key)
- [ ] Search: Open Library `/search.json?q=TITLE&fields=title,author_name,cover_i,first_publish_year`
- [ ] Fallback: Google Books API `/volumes?q=isbn:` or `intitle:`
- [ ] Return: title, authors, description, cover URL, publish year, page count, ISBN, genres

### 4.6 — Podcast Fetcher
- [ ] `worker/src/services/metadata/podcasts.ts`
- [ ] Primary: Podcast Index API `/api/1.0/search/byterm?q=TITLE` (HMAC auth with key+secret)
- [ ] Fallback: iTunes Search `https://itunes.apple.com/search?media=podcast&term=TITLE`
- [ ] If URL is an RSS feed: fetch + parse XML (use `fast-xml-parser`)
- [ ] Return: show title, description, author, artwork URL, episode count, feed URL

### 4.7 — Article OG Scraper
- [ ] `worker/src/services/metadata/articles.ts`
- [ ] Fetch the URL with `Accept: text/html` header
- [ ] Stream only the `<head>` portion (stop reading after `</head>`)
- [ ] Parse: `og:title`, `og:description`, `og:image`, `og:site_name`, `article:author`, `article:published_time`, `<title>` fallback
- [ ] Return normalized metadata

### 4.8 — Tweet Fetcher
- [ ] `worker/src/services/metadata/tweets.ts`
- [ ] Call `https://publish.twitter.com/oembed?url=TWEET_URL`
- [ ] Return: author name, tweet text (from HTML embed), timestamp, embed HTML

### 4.9 — Add Item Dialog — URL Mode
- [ ] Update `AddItemDialog.tsx`:
  - New first step: URL input field with "Fetch" button
  - On fetch: call `POST /api/ingest`, show loading skeleton
  - Pre-populate form fields from returned metadata
  - User can edit any field before saving
  - Manual mode toggle (skip URL, fill manually) remains available
- [ ] Show content type badge auto-detected from URL

**Phase 4 complete when:** Pasting a YouTube URL, TMDB movie URL, book title, or article URL auto-fills title, cover, description, and creator. Metadata is cached — second fetch of same URL is instant.

---

## Phase 5 — AI Features

> Goal: Auto-categorize on add, on-demand AI summary per item, and a "next to consume" ranked list.

### 5.1 — Gemini Service
- [ ] `worker/src/services/ai.ts`:
  - `callGemini(prompt, responseSchema)` — generic Gemini Flash-Lite call with structured output
  - `buildCategorizePrompt(title, description, url)` → categorization prompt
  - `buildAnalysisPrompt(item)` → content-type-aware analysis prompt
  - `buildNextListPrompt(items, userPreferences)` → ranking prompt
- [ ] Add `GEMINI_API_KEY` as Wrangler secret

### 5.2 — Auto-Categorize on Add
- [ ] After metadata is fetched (or manual add submitted), fire `POST /api/ai/categorize`
- [ ] Worker calls Gemini with title + description + URL domain
- [ ] Returns: `{ content_type, confidence, suggested_tags, suggested_status }`
- [ ] If `confidence > 0.8`, auto-apply; otherwise surface suggestion to user with "Accept / Change" UI
- [ ] Store result in `ai_cache` table

### 5.3 — AI Analysis API Route
- [ ] `worker/src/routes/ai.ts`:
  - `POST /api/ai/analyze/:itemId` — trigger analysis for a single item
  - Check `ai_cache` first (return cached if < 7 days old)
  - Build prompt based on `content_type`
  - Call Gemini, store in `ai_cache`, return result
  - `POST /api/ai/next-list` — generate ranked next-to-consume list
  - Pulls all `status = 'suggestions'` items
  - Bundles into single Gemini call with user preferences
  - Caches result in KV for 6 hours

### 5.4 — AI Summary Panel UI
- [ ] `apps/web/src/components/AiSummaryPanel.tsx` — rendered in item detail view
- [ ] "Analyze" button triggers `POST /api/ai/analyze/:itemId`
- [ ] Show loading state (animated shimmer)
- [ ] Display result: summary bullets, mood/genre tags, personalized rating
- [ ] Show cache age ("Analyzed 3 days ago · Refresh")
- [ ] `apps/web/src/hooks/useAI.ts` — TanStack Query mutation + query for analysis

### 5.5 — Item Detail Modal
- [ ] `apps/web/src/routes/item.$id.tsx` — route-based modal (renders over board/grid)
- [ ] Large cover image, full title/creator/description
- [ ] Status selector (inline change)
- [ ] Personal rating (1–5 stars, click to set)
- [ ] Notes textarea (auto-save on blur)
- [ ] Tags section (add/remove)
- [ ] AI Summary Panel at the bottom

### 5.6 — "Next to Consume" Page
- [ ] `apps/web/src/routes/next.tsx` — dedicated page accessible from top nav
- [ ] Calls `POST /api/ai/next-list` on load
- [ ] Shows ranked list with Gemini's 1-line reasoning per item
- [ ] "Move to In Progress" button per item
- [ ] "Refresh" button (bypasses 6h KV cache)

**Phase 5 complete when:** Adding an item auto-suggests tags/type. Clicking "Analyze" on any item returns a Gemini summary. The Next page shows a ranked watchlist with reasoning.

---

## Phase 6 — Polish & Search

> Goal: Grid view, tags, search, filter, settings, responsive mobile.

### 6.1 — Grid View
- [ ] `apps/web/src/components/GridView.tsx` — CSS `columns` masonry layout
- [ ] Grouped by content type (expandable sections) or flat with type filter
- [ ] Same `ItemCard` component used in Board view
- [ ] View toggle (Board / Grid) persists to `localStorage`

### 6.2 — Tags System
- [ ] `worker/src/routes/tags.ts` — `GET/POST/DELETE /api/tags`
- [ ] Tags component in Item Detail: type to create or select existing, colored pills
- [ ] Tag filter in sidebar: click a tag → filters all views to show only tagged items
- [ ] AI-suggested tags (from categorize call) shown as "+ Add suggested: action, sci-fi" prompt

### 6.3 — Search
- [ ] `apps/web/src/components/SearchCommand.tsx` — shadcn `Command` dialog, triggered by `Cmd+K`
- [ ] Local search over TanStack Query cache (instant, no API call for title/creator)
- [ ] Falls back to `GET /api/items?q=QUERY` for full-text search via D1 `LIKE` query
- [ ] Results grouped by content type

### 6.4 — Settings Page
- [ ] `apps/web/src/routes/settings.tsx`
- [ ] **Profile:** name, email (read-only), change password
- [ ] **AI Preferences:** free-text taste profile ("I like hard sci-fi and literary fiction, dislike horror") — saved to `users.preferences` JSON
- [ ] **API Keys:** UI to enter/update TMDB key, YouTube key, etc. (stored as Worker secrets via API or just in wrangler secrets)
- [ ] **Data:** Export all items as JSON, clear AI cache

### 6.5 — Responsive Mobile
- [ ] Board view: horizontal scroll (one column visible, swipe to next)
- [ ] Grid view: single column below 640px
- [ ] Add Item button → bottom-sheet style on mobile
- [ ] Top nav collapses to hamburger menu

### 6.6 — Final Deployment
- [ ] Run `wrangler d1 migrations apply sirajhub-db` (production D1, not local)
- [ ] Set all secrets in production: `wrangler secret put GEMINI_API_KEY` (repeat for each key)
- [ ] `wrangler deploy` → verify live URL
- [ ] Add custom domain in Cloudflare Workers → Custom Domains
- [ ] Smoke test: add item from each content type, verify AI analysis, verify drag-drop

**Phase 6 complete when:** All views work on mobile. Search works. Tags filter correctly. Settings save. App is live at your custom domain.**

---

## Summary Table

| Phase | Goal | Estimated Files |
|---|---|---|
| 1 — Foundation ✅ | Monorepo, Worker skeleton, D1 schema, React scaffold, CI | 28 files — done |
| 2 — Auth | Better Auth, login page, session middleware | ~8 files |
| 3 — Core CRUD | Items API, Board view, ItemCard, Add dialog | ~12 files |
| 4 — Ingest Pipeline | URL dispatcher + 6 fetchers, caching | ~10 files |
| 5 — AI Features | Gemini service, auto-categorize, summary panel, next list | ~8 files |
| 6 — Polish | Grid, tags, search, settings, mobile, deploy | ~10 files |
