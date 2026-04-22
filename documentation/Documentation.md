## Version 0

### Tasks

**Setup (Required before development)**

- Create accounts:
  - Cloudflare (enable Workers & Pages, connect domain)
  - Google Cloud (for YouTube + Books APIs)
  - TMDB (movies/TV metadata)
  - Podcast Index (podcast metadata)
  - Google AI Studio (Gemini API)

- Generate API keys:
  - `GEMINI_API_KEY`
  - `TMDB_API_KEY`
  - `YOUTUBE_API_KEY`
  - `GOOGLE_BOOKS_API_KEY`
  - `PODCAST_INDEX_KEY` + `PODCAST_INDEX_SECRET`
  - Store all as Cloudflare Worker secrets

- Create Cloudflare resources:
  - D1 database: `sirajhub-db`
  - KV namespace: `SIRAJHUB_KV`
  - Worker (created on first deploy)

- Install local tools:
  - Node.js 20+
  - pnpm
  - Wrangler CLI (login required)
  - Git

### Explainer

This version establishes the full foundation of the system.

All external dependencies are configured upfront to avoid blocking development later. The system relies on multiple APIs for content ingestion (books, videos, podcasts, movies) and AI processing, so early setup ensures smooth integration.

Cloudflare is the core infrastructure, handling:
- Backend logic (Workers)
- Storage (D1 + KV)
- Deployment

### Summary

Version 0 is environment setup only.

No application logic is built yet. The goal is to prepare all accounts, APIs, and infrastructure so development can proceed without interruptions.

## Version 0.1

### Tasks

**Foundation Setup (Complete stack working locally)**

- Monorepo:
  - pnpm workspace (`apps/web`, `worker`)
  - Root config: `package.json`, `pnpm-workspace.yaml`, `.gitignore`
  - `wrangler.toml` with D1, KV, and static assets

- Backend (Worker):
  - Hono app with `GET /api/health`
  - Env typing for D1 + KV
  - Verified local Worker runs

- Database:
  - Drizzle schema (7 tables: users, sessions, items, tags, item_tags, ai_cache, url_cache)
  - Generated and applied migrations to local D1
  - Verified tables exist

- Frontend:
  - React 19 + Vite + TypeScript app
  - TanStack Router (file-based routing)
  - TanStack Query (data fetching)
  - Tailwind v4 with OKLCH theme
  - Landing page + API connectivity check

- Dev Integration:
  - Vite + Cloudflare plugin (frontend ↔ Worker proxy)
  - `pnpm dev` runs full stack locally

- CI/CD:
  - GitHub Actions workflow:
    - Install → build → deploy → run migrations
  - Requires `CF_API_TOKEN` and `CF_ACCOUNT_ID` secrets

---

### Explainer

This version builds the full working skeleton of the system.

All core layers are connected:
- Frontend (React)
- Backend (Cloudflare Worker with Hono)
- Database (D1 with Drizzle)
- Cache (KV)

The app is deployable and runs both locally and in production. While no real features exist yet, the system already supports:
- API requests
- Database reads/writes
- Frontend rendering
- Automated deployments

This ensures future work focuses only on features, not setup or infrastructure.

---

### Summary

Version 0.1 delivers a complete, working foundation.

The system runs end-to-end:
- Local development works (`pnpm dev`)
- API responds (`/api/health`)
- Database is initialized
- Deployment is automated

No product features yet, but the architecture is fully ready for development.

## Version 0.2

### Tasks

**Authentication Layer**

- Installed Better Auth in both backend and frontend
- Configured Better Auth with:
  - D1 via Drizzle adapter
  - Email/password login only
  - `AUTH_SECRET` as an environment secret
- Mounted auth routes at `/api/auth/*`

- Extended database schema with:
  - `account`
  - `verification`
- Generated and applied auth migration

- Added session middleware to:
  - Validate session cookies on protected API routes
  - Inject `userId` into request context
  - Return `401 Unauthorized` when no valid session exists

- Built login flow:
  - `/login` page with sign-in / sign-up toggle
  - Better Auth client integration
  - Redirect unauthenticated users to `/login`
  - Redirect authenticated users to `/`
  - Added logout action

- Fixed local migration path to match Vite plugin D1 state

---

### Explainer

This version locks the app behind authentication.

A user can now register, log in, stay logged in through a session cookie, and log out. All API routes except auth endpoints are protected by middleware, so unauthorized requests are blocked before they reach application logic.

The frontend also enforces auth at the routing level, which means protected pages cannot render unless a valid session exists.

This creates the first real security boundary for the app and prepares the system for user-specific data.

---

### Summary

Version 0.2 adds full app authentication.

The app now supports:
- Sign up
- Sign in
- Persistent sessions
- Logout
- Protected routes and APIs

At this point, the system is no longer publicly accessible and is ready for real user data and feature work.

## Version 0.3

### Tasks

**Core Item Management**

- Built items API with full CRUD:
  - `GET /api/items`
  - `POST /api/items`
  - `PATCH /api/items/:id`
  - `DELETE /api/items/:id`
- Scoped all item actions to the authenticated user
- Exported shared app types from the Worker

- Added frontend API layer:
  - Typed `Item` model
  - Fetch helpers for list/create/update/delete
  - Shared content type and status constants
  - TanStack Query hooks for all item operations

- Built app shell:
  - Persistent top navigation
  - Global "+ Add Item" action
  - User menu with logout

- Built Kanban board:
  - 4 columns: Suggestions, In Progress, Finished, Archived
  - Item count per column
  - Drag and drop between columns
  - Visual drag overlay and drop highlighting

- Built item cards:
  - Cover image or fallback icon
  - Title, creator, content type, rating
  - Actions for archive and delete

- Built manual add dialog:
  - Form for all main item fields
  - Create flow wired to API
  - Query invalidation so board updates automatically

---

### Explainer

This version makes the app actually usable.

Users can now manually add content items, view them on a status board, update them, move them between workflow stages, and delete or archive them. The board acts as the main working view, while the API and query layer provide the data structure needed to support all item interactions cleanly.

This is also the first version where the app behaves like a real product instead of just an authenticated shell. The full CRUD flow is in place, and every change is saved to D1.

---

### Summary

Version 0.3 adds the core product workflow.

The app now supports:
- Creating items manually
- Viewing them in a board layout
- Updating and moving them across statuses
- Deleting and archiving them
- Persisting all changes in the database

At this point, the system has a complete manual tracking workflow, even though metadata fetching and automation have not been added yet.

## Version 0.4

### Tasks

**Metadata Ingest Pipeline**

- Built ingest API:
  - `POST /api/ingest`
  - Accepts URL or search query
  - Detects content type automatically or uses provided type
  - Returns a normalized metadata object
  - Caches results in `url_cache` for 24 hours

- Built dispatcher for metadata sources:
  - YouTube
  - Books
  - Movies
  - TV
  - Podcasts
  - Tweets
  - Generic articles

- Built source-specific fetchers:
  - YouTube Data API
  - TMDB for movies and TV
  - Open Library with Google Books fallback
  - iTunes Search with Podcast Index fallback
  - Article scraper using Cloudflare HTMLRewriter
  - Tweet fetcher using Twitter/X oEmbed

- Updated Add Item dialog:
  - Added 3 modes: Paste URL, Search by name, Manual
  - Fetches metadata before saving
  - Auto-fills form fields from fetched results
  - Shows cover preview when available
  - Keeps manual entry as a fallback

---

### Explainer

This version replaces manual entry as the default workflow.

Instead of typing every field by hand, the user can now paste a URL or search by title and let the system fetch the metadata automatically. The backend detects the content source, calls the relevant external service, normalizes the response into one shared format, and sends it back to the form for review before saving.

Caching is an important part of this version. Once metadata for a URL is fetched, it is stored locally for 24 hours, which makes repeated requests much faster and reduces dependency on external APIs.

This turns item creation into a faster and more reliable flow while keeping manual entry available when metadata cannot be resolved cleanly.

---

### Summary

Version 0.4 adds the ingest pipeline.

The app now supports:
- Auto-fetching metadata from URLs
- Search-based metadata lookup
- Normalized results across all content types
- Local caching for repeated fetches
- Faster item creation with manual fallback still available

At this point, the app moves beyond manual tracking and starts behaving like a real content capture system.

## Version 0.5

### Tasks

**AI Layer**

- Built Gemini service with structured JSON output
- Added AI utilities for:
  - Item categorization
  - Item analysis
  - Ranking a "next to consume" list
- Configured `gemini-2.0-flash-lite` as the AI model
- Added support for `GEMINI_API_KEY` in Worker secrets

- Built AI API routes:
  - `POST /api/ai/analyze/:id`
  - `GET /api/ai/next`
- Added caching for AI features:
  - Item analysis cached in `ai_cache`
  - Ranked next-list cached in KV
  - Refresh option to bypass cached next-list results

- Added frontend AI layer:
  - API helpers for analyze and next-list
  - TanStack Query hooks for analysis, fetch, and refresh

- Updated item cards:
  - Added "Analyze" action
  - Inline analysis panel with summary, key points, recommendation, and optional mood
  - Loading and collapse behavior

- Added "Next to Consume" panel:
  - Triggered from nav bar
  - Shows ranked suggestion items with reasoning
  - Supports manual refresh
  - Indicates when data is cached

---

### Explainer

This version introduces the first AI-powered features in the app.

Users can now ask the system to analyze an item on demand and receive a structured result directly on the card. The app can also generate a ranked "next to consume" list from items in the Suggestions column, using Gemini to sort them based on the available data and user preferences.

Caching is central here. AI analysis is saved so repeated requests do not waste API calls, and ranked recommendation lists are temporarily cached to keep the experience fast and cost-efficient.

The categorization utility was also added in this version, although it was prepared for future integration rather than being fully used in the add-item flow immediately.

---

### Summary

Version 0.5 adds the AI feature set.

The app now supports:
- On-demand AI analysis for items
- Cached summaries and recommendations
- A ranked "next to consume" list
- Reusable AI categorization utilities

At this point, the system is no longer just a tracker. It also helps interpret and prioritize what the user should consume next.

## Version 0.6

### Tasks

**Polish, Organization, and Search**

- Built Grid view:
  - Masonry-style layout using CSS columns
  - Reused the same `ItemCard` component as Board view
  - Added Board / Grid toggle
  - Persisted selected view in `localStorage`

- Added filtering:
  - Content-type filter pills above views
  - Tag-based filtering across Board and Grid

- Built full tags system:
  - Tag CRUD API
  - Per-item tag assignment and removal
  - Frontend tag hooks and color palette
  - Tag display on item cards
  - Tag management in item detail panel
  - Tag manager in Settings

- Built search:
  - Cmd+K / Ctrl+K search palette
  - Instant client-side search over cached items
  - Worker-side query fallback with `GET /api/items?q=...`
  - Grouped results by content type

- Built Settings page:
  - Editable profile name
  - Read-only email
  - AI preferences field saved to user profile
  - Tag management section
  - JSON export
  - Clear AI cache action

- Improved mobile responsiveness:
  - Horizontal scrolling board on small screens
  - Responsive grid column counts
  - Mobile nav with hamburger menu
  - Existing modal flows kept mobile-friendly

---

### Explainer

This version is focused on usability and completeness.

The app already had the core workflow, but this release adds the tools needed to manage a growing library comfortably. Users can now switch between Board and Grid views, organize items with tags, search instantly across their content, and manage profile and AI-related settings from a dedicated page.

It also improves the experience across screen sizes, especially on mobile, where navigation and view layouts now adapt properly instead of relying on desktop-only patterns.

This is the version where the product starts to feel polished rather than just functional.

---

### Summary

Version 0.6 adds the product polish layer.

The app now supports:
- Board and Grid views
- Tagging and tag filters
- Fast global search
- User settings and data tools
- A responsive mobile experience

At this point, the app is feature-complete enough to feel like a usable personal product, not just a working prototype.

## Version 0.7

### Tasks

**Deferred Core Features**

- Added within-column drag reordering:
  - Enabled sortable item lists inside each status column
  - Persisted manual order using the `position` field
  - Reordered items with normalized position values
  - Kept API sorting stable by `position` then `createdAt`

- Added AI auto-categorization on add:
  - Built `POST /api/ai/categorize`
  - Added frontend API client and hook for categorization
  - Triggered categorization after ingest completes
  - Surfaced AI type suggestion as a clickable hint in the add dialog when confidence is high

- Added AI tag suggestions:
  - Added "✨ Suggest" action in the item detail panel
  - Used AI categorization output to suggest tags
  - Filtered out tags already applied
  - Allowed suggested tags to either reuse an existing tag or create a new one automatically

- Added auto-timestamps on status changes:
  - Auto-set `startedAt` when an item first moves to `In Progress`
  - Auto-set `finishedAt` when an item first moves to `Finished`
  - Preserved existing timestamps and avoided overwriting explicit values
  - Displayed started and finished dates in the item detail panel

- Final deployment checklist prepared:
  - Run remote migrations
  - Set production secrets
  - Deploy Worker
  - Attach custom domain
  - Smoke test the live app

---

### Explainer

This version closes the remaining gaps between the original plan and the implemented app.

Several features had already been partially prepared in the architecture but were not fully wired into the product. This release completes those missing links: users can now manually rank items inside a column, receive AI suggestions for content type and tags, and automatically capture important lifecycle dates when an item moves into active or completed states.

These changes do not introduce a new product area. Instead, they finish incomplete workflows and make the existing system more consistent, intelligent, and useful in day-to-day use.

---

### Summary

Version 0.7 completes the deferred requirements.

The app now supports:
- Reordering items within a status column
- AI-assisted type suggestions during item creation
- AI-generated tag suggestions in item details
- Automatic started and finished timestamps
- A final production deployment checklist

At this point, the planned foundation, CRUD, ingest, AI, organization, and deferred workflow features are all functionally covered.

## Version 2.0

### Tasks

#### Version 2.01 — shadcn/ui Setup

- Added `@/*` path alias support in the frontend config
- Added Vite alias resolution for `@`
- Installed shadcn/ui support dependencies:
  - `clsx`
  - `tailwind-merge`
  - `lucide-react`
  - `@types/node`
- Added shared `cn()` utility
- Created shadcn configuration
- Bridged the existing OKLCH design tokens into shadcn-compatible theme tokens
- Fixed sidebar token conflicts so the dark theme remained visually consistent
- Installed the first batch of shadcn UI primitives:
  - button, badge, tooltip, sheet, sidebar, dialog, tabs, card, separator, scroll-area, select, radio-group, input, textarea, label, avatar, dropdown-menu

#### Version 2.02 — Navigation: Sidebar + Topbar

- Rebuilt the root layout into:
  - sidebar
  - topbar
  - main routed content area
- Preserved all existing global overlays and shared state:
  - Add Item dialog
  - Search command
  - Item detail panel
- Built `AppSidebar` with route navigation for:
  - Dashboard
  - Books
  - Movies
  - TV Shows
  - Podcasts
  - Videos
  - Articles
  - Tweets
  - Settings
- Added icons and color markers for each media type
- Added active-state styling for current route
- Built `AppTopbar` with:
  - mobile hamburger
  - search trigger
  - add item action
  - user dropdown
- Added mobile sidebar drawer behavior using `Sheet`

#### Version 2.03 — Backend: Per-User API Keys & Model Selection

- Extended the `user` table with an `apiKeys` JSON field
- Added migration for the new `api_keys` column
- Added user settings API:
  - `GET /api/user/settings`
  - `PATCH /api/user/settings`
- Ensured settings endpoints never return raw secrets
- Added per-user key resolution for:
  - Gemini
  - TMDB
  - YouTube
  - Google Books
  - Podcast Index
- Updated AI calls to resolve the model from user settings
- Added frontend API helpers and hooks for user settings and API key updates

#### Version 2.04 — Expanded Settings Page

- Rebuilt Settings with tabbed navigation
- Added tabs for:
  - Profile
  - API Keys
  - AI Model
  - Tags
  - Data
- Kept profile editing and AI taste preferences
- Added API key rows with:
  - masked saved state
  - save action
  - service-specific inputs
- Added AI model selection with recommended and alternative Gemini options
- Moved tag management into its own tab
- Moved export and AI cache tools into a dedicated data tab

#### Version 2.05 — Dashboard

- Replaced the previous home page with a dashboard layout
- Added TypeStats widget:
  - 7 media-type tiles
  - item counts
  - click-through navigation
- Added RecentlyAdded widget:
  - latest items
  - compact cover-based cards
- Added InProgress widget:
  - items currently being consumed
  - elapsed-time context from `startedAt`
- Added inline NextToConsume widget:
  - reused AI ranking flow
  - added refresh support

#### Version 2.06 — Item Detail Page

- Added dynamic route: `/item/$id`
- Built full-page item detail layout
- Added large metadata-focused left column
- Added editable right column for:
  - fields
  - notes
  - tags
  - AI actions
- Added inline editing with autosave behavior
- Added back navigation behavior
- Extracted reusable `AIPanel`
- Extracted reusable `InlineTagManager`
- Shared those components between the new page and existing detail surfaces

#### Version 2.07 — Per-Type Artistic Views

- Added dedicated routes for:
  - `/books`
  - `/movies`
  - `/tv`
  - `/podcasts`
  - `/videos`
  - `/articles`
  - `/tweets`
- Added media-specific view components:
  - text-first article list
  - tweet feed
  - podcast artwork grid
  - video thumbnail grid
  - movie poster grid
  - TV poster grid with season metadata
  - bookshelf-style books layout
- Added status filtering across type pages
- Linked all media cards to the full item detail route
- Added visually distinct layouts to better match each content type

---

### Explainer

Version 2.0 is a full frontend redesign built on top of the working V1 system.

The backend foundation, item workflows, ingest pipeline, AI features, and organization logic from earlier versions stay in place. What changes here is how the product is structured and experienced.

The redesign starts by introducing shadcn/ui as the component foundation, which gives the app a more consistent and scalable UI system. From there, the app shell is rebuilt around a sidebar and topbar, making navigation feel like a real multi-section product instead of a single-page tool.

The homepage is then redefined as a dashboard rather than a board-first workspace. Instead of treating all content the same, Version 2.0 introduces dedicated browsing pages for each media type, each using a layout that better fits the medium itself. Books become shelf-like, movies and TV become poster-driven, tweets become feed-like, and articles become text-first.

This version also makes item pages first-class routes. Instead of relying only on overlays, each item can now open in a full-page detail view with inline editing, tags, notes, and AI actions. That makes the app easier to navigate, link, and expand over time.

On the backend side, the main improvement is per-user API key and AI model support. Users can now save their own provider keys and choose which Gemini model powers AI features, while the app still falls back to environment secrets when needed.

Overall, this version does not change the core purpose of the product. It changes the presentation, navigation, configurability, and product feel. V1 proved the system worked. Version 2.0 makes it feel designed, structured, and personal.

---

### Summary

Version 2.0 is the transition from a functional prototype-style interface to a full product experience.

It adds:
- a reusable design system with shadcn/ui
- a proper sidebar and topbar app shell
- per-user API key and AI model management
- a structured tabbed settings experience
- a dashboard homepage
- a full-page item detail route
- dedicated artistic views for each media type

A useful way to think about this version is:

- **Version 2.01 to 2.04** establish the new foundation and product shell
- **Version 2.05 to 2.07** turn that shell into a richer browsing and editing experience

At this point, the system is no longer just a tracker with multiple features. It becomes a designed media workspace with distinct pages, stronger identity, and better user control.

## Version 2.1

### Tasks

**Visual System Refinement**

- Rebuilt the global visual theme around a soft light analytics style:
  - lighter page background
  - white card surfaces
  - pale blue and lilac accents
  - softer borders and shadows
  - cleaner sans-serif typography

- Rethemed shared UI primitives:
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
  - sidebar components

- Updated core app surfaces to match the refined design system:
  - dashboard
  - settings
  - login page
  - add item dialog
  - search dialog
  - next-list panel
  - item cards
  - item detail views
  - AI panel
  - inline tag manager

- Refined sidebar layout:
  - removed oversized descriptive content from the top area
  - compressed the branding block
  - simplified the bottom workspace card
  - shortened "Workspace Preferences" to "Preferences"
  - preserved all existing routes and behavior

- Refined dashboard layout:
  - removed squeezed type stats from the hero card
  - created a dedicated full-width `Library Types` section
  - redesigned type stats as wider horizontal tiles
  - kept the hero focused on headline and summary content

---

### Explainer

Version 2.1 is a refinement pass on top of the Version 2.0 redesign.

The structural changes introduced in Version 2.0 were successful, but the first visual pass still felt off. The styling was heavier and noisier than intended, and some layout choices reduced usability, especially in the sidebar and dashboard.

This version corrects that by shifting the app toward a softer analytics-style interface. The visual system becomes lighter, calmer, and more consistent across pages, dialogs, cards, and shared components. At the same time, the layout is rebalanced so navigation fits more comfortably and dashboard statistics are easier to read.

This is not a new feature release. It is a design and usability correction that makes the redesigned product feel more polished and coherent.

---

### Summary

Version 2.1 refines the Version 2 redesign.

It adds:
- a softer light analytics visual system
- cleaner typography and calmer surfaces
- consistent retheming across shared UI and major screens
- a more compact sidebar
- a more readable dashboard stats layout

At this point, the redesigned app keeps the same structure and features from Version 2.0, but presents them in a more polished and usable way.

## Version 2.2

### Tasks

**Feature Optimization & Reliability**

- Added saved AI analysis per item:
  - Kept `ai_cache` as the source of truth
  - Added read endpoint for latest saved analysis
  - Updated analysis flow to persist results with metadata:
    - `savedAt`
    - `modelUsed`
    - cache/queue state
  - Showed saved analysis by default with option to refresh

- Improved search-based ingest:
  - Added `POST /api/ingest/search` returning top 5 suggestions
  - Added `POST /api/ingest/resolve` to convert a selected result into normalized metadata
  - Updated Add Item flow to:
    - search → review suggestions → select → populate form
  - Kept direct URL ingest unchanged

- Added source detection guidance:
  - Defined supported auto-detectable sources per content type
  - Added inline helper in URL mode with examples
  - Added helper note in search mode for supported types

- Added persistent AI queue system:
  - Created `ai_jobs` table with migration
  - Added job states: queued, processing, completed, failed
  - Stored attempts, scheduling, and errors
  - Queued analysis and next-list generation instead of running only on demand
  - Added scheduled Worker with cron trigger
  - Added retry logic with capped attempts
  - Persisted results after completion

- Extended user settings:
  - Added `aiQueueIntervalMinutes` with default of 60
  - Allowed users to control queue execution frequency

- Added AI Queue UI:
  - Displayed queue tasks in Settings
  - Showed job status and progress
  - Allowed retry of failed jobs

---

### Explainer

Version 2.2 focuses on making core workflows more reliable and production-ready.

Earlier versions introduced AI features, ingest flows, and automation, but many of these behaviors were still tied to immediate actions. This version shifts those features into a more durable system.

AI analysis is no longer treated as a temporary response. It is saved, retrievable, and refreshable. The user can always see the last valid result while new work is queued in the background.

Search-based ingest is also improved. Instead of guessing the best match, the system now presents multiple options and lets the user choose before populating the form. This reduces errors and gives the user more control.

The biggest change is the introduction of a persistent AI job queue. AI work is now scheduled, stored, and retried if needed. It no longer depends only on the user triggering actions manually. The queue is also visible and manageable from the UI, which makes background processing transparent.

Overall, this version turns several features from one-time actions into stable, trackable, and repeatable processes.

---

### Summary

Version 2.2 improves reliability and automation.

It adds:
- persistent AI analysis with saved state
- safer search-based ingest with top-5 selection flow
- clear guidance for supported URL sources
- a scheduled, persistent AI job queue with retry support
- user control over AI processing intervals
- visibility into AI task status and progress

At this point, the system moves from interactive-only behavior to a combination of saved state and background processing, making it more robust for real usage.

## Version 2.3

### Tasks

**UX Polish and Queue Behavior**

- Redesigned the articles page into a cleaner editorial feed
- Added a left-side timeline rail and stronger visual hierarchy for article rows
- Improved article metadata display for:
  - domain
  - creator
  - date
  - estimated reading time
- Added clearer per-item actions inside article rows

- Added explicit editing actions:
  - `Edit` action on article rows
  - `Edit Details` button on the item detail page
  - in-page editor card for core metadata on `/item/$id`

- Fixed shared select-menu layout behavior:
  - corrected viewport sizing
  - prevented status dropdown collapse and overlap
  - applied fix at the shared UI primitive level

- Updated AI queue timing policy:
  - newly queued jobs run immediately when fewer than 5 active jobs exist
  - failed automatic retries are delayed by 60 minutes
  - manual retries remain immediate

---

### Explainer

Version 2.3 is a polish release focused on everyday usability.

The major systems introduced in earlier versions were already working, but a few common interactions still felt rough. Articles looked too plain compared to the rest of the app, editing actions were too hidden, the shared status select had a layout bug, and AI queue timing needed to be more responsive for small personal workloads.

This version improves those areas without changing the broader product structure. It makes article browsing feel more designed, editing easier to discover, select menus more stable, and queue behavior smarter under light usage and failure conditions.

---

### Summary

Version 2.3 improves daily interaction quality.

It adds:
- a redesigned editorial-style articles view
- clearer editing actions from both article rows and item pages
- a shared fix for select dropdown layout issues
- more responsive and practical AI queue timing

At this point, the product feels smoother and more predictable in regular use.

## Version 2.4

### Tasks

**Bulk Import Foundations**

- Added a `CSV Import` mode to the existing Add Item dialog
- Allowed direct `.csv` file upload from the dialog
- Parsed CSV rows in the frontend before sending data to the backend
- Supported practical column aliases such as:
  - `content_type` / `type`
  - `author`
  - `cover_url`
  - `url`
- Kept single-item URL, search, and manual add flows unchanged

- Added preview and validation for import rows:
  - preview of valid rows before import
  - required field validation for `title` and `contentType`
  - constrained validation for:
    - supported statuses
    - rating from 1 to 5
  - row-level validation error display
  - partial import support so valid rows can still be imported

- Added bulk create backend route:
  - `POST /api/items/import/csv`
  - accepts normalized item payloads
  - creates items in bulk for the authenticated user
  - returns import summary with:
    - created items
    - created count
    - failed count
    - row-level errors

---

### Explainer

Version 2.4 starts the bulk import track.

Up to this point, the app was optimized for adding content one item at a time. That works well for discovery and day-to-day tracking, but it is too slow when a user already has a library somewhere else.

This version adds the first practical migration path by supporting CSV import. The Add Item dialog is expanded rather than replaced, which keeps the import flow consistent with the rest of the product. Validation and preview are built into the process so users can review rows before import, see what is wrong, and still proceed with the valid data.

The new backend bulk-create route makes this a real product workflow rather than a frontend-only convenience.

---

### Summary

Version 2.4 adds the first bulk import system.

It adds:
- CSV upload inside the Add Item dialog
- preview and validation before import
- partial import support
- backend bulk item creation with structured import summaries

At this point, the app can start accepting larger existing libraries instead of only one-off additions.

## Version 2.5

### Tasks

**Dark Theme System**

- Added a theme provider supporting:
  - `light`
  - `dark`
- Persisted theme choice in local storage
- Applied theme state on app startup to avoid flash-of-wrong-theme behavior
- Added theme switchers in:
  - the signed-in shell topbar
  - the login page

- Added dedicated dark design tokens in `index.css`
- Rethemed dark-mode core surfaces:
  - background
  - cards and popovers
  - borders and inputs
  - sidebar
  - shadows
- Shifted the dark-mode accent from blue to orange
- Added more technical utility styling for small labels and dashboard metadata in dark mode

- Adapted the shell and major surfaces so dark mode feels intentional:
  - sidebar
  - topbar
  - login page
  - collection pages
  - article and tweet views
  - next-list surfaces
  - shared cards, badges, and controls

---

### Explainer

Version 2.5 introduces a complete dark theme system.

Earlier versions had a polished light mode, but no fully designed second theme. This release adds both the technical theme system and a distinct dark visual language. Instead of simply inverting colors, the dark theme uses its own palette, depth, contrast rules, and accent logic.

The app now remembers the user’s chosen theme, applies it early at startup, and exposes visible theme controls across both the signed-in shell and the login screen. Major surfaces were also adjusted so dark mode feels intentionally designed rather than partially overridden.

---

### Summary

Version 2.5 adds full dark mode support.

It adds:
- persistent light and dark theme state
- visible theme switching controls
- a dedicated dark visual system
- shell and surface updates so dark mode feels complete

At this point, the app supports two real visual modes rather than one primary theme with limited overrides.

## Version 2.6

### Tasks

**Interest-Based Suggest Metric and Next-To-Consume Ranking**

- Added per-media-type interest profiles in settings
- Kept interests separate from tags
- Used free-form chips per content type
- Added chip weights:
  - `low`
  - `medium`
  - `high`
- Stored interest profiles inside the existing user settings structure

- Extended items with stored recommendation fields:
  - `suggestMetricBase`
  - `suggestMetricFinal`
  - `suggestMetricUpdatedAt`
  - `suggestMetricReason`
  - `trendingBoostEnabled`
- Defined final score as:
  - AI base score `0–1000`
  - `Recent` boost `+50`
  - `Trending` boost `+100`
- Applied `Recent` only during the first 7 days and only while status is `suggestions`

- Added score queue jobs:
  - new AI job type: `score_item`
  - automatic scoring on item creation
  - score refresh queueing when recommendation-relevant fields change
  - scoring input includes item context plus that media type’s interest profile
  - stored returned score and explanation on the item
  - recomputed final score whenever boosts or scoring state changed

- Rebuilt Next To Consume around stored scores:
  - removed direct AI queue ranking dependency
  - added global next-to-consume from `suggestions`
  - added type-specific next-to-consume on collection pages
  - sorted by:
    - `suggestMetricFinal DESC`
    - `suggestMetricUpdatedAt DESC`
    - `createdAt DESC`
    - `title ASC`
  - excluded finished and archived items

- Added item and queue visibility for scoring:
  - manual `Trending` toggle on item detail page
  - score display on item page:
    - base score
    - final score
    - boosts
    - explanation
    - last updated
  - included `score_item` jobs in AI Queue
  - allowed failed score jobs to be retried

---

### Explainer

Version 2.6 replaces the original Next To Consume model with a stored recommendation system.

Earlier versions relied on AI directly ranking the current queue. That worked, but it was difficult to reuse across the product, explain clearly, or personalize per media type. This version changes the model by storing recommendation signals directly on each item.

The new system combines AI-generated base scoring with deterministic product boosts for recency and manual trending. It also introduces weighted interest profiles by media type, which gives the recommendation system better personalization than a single general preference field.

Because the score now lives on each item, recommendation lists can be reused globally and per type without re-running whole-list ranking prompts every time.

---

### Summary

Version 2.6 adds a stored recommendation layer.

It adds:
- weighted interest profiles per media type
- persistent recommendation fields on items
- queued AI scoring jobs
- score-driven next-to-consume views
- visible recommendation details and manual trending controls

At this point, recommendations become a reusable product system rather than a one-shot ranking feature.

## Version 2.7

### Tasks

**UI Cleanup Pass**

- Simplified the sidebar:
  - removed boxed logo and slogan block
  - kept only the `SirajHub` app name in the header
  - simplified footer into:
    - gear-only settings action
    - dot-only live indicator
  - kept navigation items and active-state behavior unchanged

- Cleaned up the top bar:
  - removed the `dashboard` label
  - moved `Next To Consume` entry point into the top bar
  - kept search, theme switcher, add button, and avatar menu unchanged
  - preserved existing next-to-consume dialog behavior

- Flattened shared internal page layout:
  - standardized collection pages into:
    - title row
    - filters row
    - one main content container
  - removed extra stacked header containers
  - kept per-type next-to-consume inside the main content container

- Simplified Settings and item detail pages:
  - removed framed hero-style header from Settings
  - kept Settings as a flatter title + tabs + content layout
  - reworked item page into a title-first layout
  - replaced stacked cards with clearer section dividers inside one main surface

- Cleaned up internal header icons:
  - removed decorative emoji/icon treatment from collection page titles
  - removed decorative header icons from the item detail hero area
  - kept icons where they still help in cards, lists, and previews

---

### Explainer

Version 2.7 is a cleanup pass focused on reducing visual framing and unnecessary chrome.

By this stage, the app had a solid design system, but some internal pages and shell elements still felt over-boxed. The sidebar branding, top bar labeling, stacked page containers, and decorative header icons were adding noise without adding much value.

This release simplifies those areas and standardizes internal pages around a lighter, title-first structure. It does not introduce new product logic. Its goal is to make the product feel calmer, flatter, and more intentional.

---

### Summary

Version 2.7 simplifies the interface.

It adds:
- a lighter sidebar header and footer
- a cleaner top bar
- flatter collection-page structure
- simpler Settings and item-detail framing
- less decorative header treatment

At this point, the app keeps the same core features while feeling more restrained and cohesive.

## Version 2.8

### Tasks

**AI Surface Tightening**

- Reduced AI to two product features only:
  - `analyze_item`
  - `score_item`
- Removed `rank_next` from:
  - backend
  - frontend
  - queue UI
  - shared types
- Removed standalone categorization as a user-facing AI path
- Kept `Next To Consume` as a read-only score-derived product view

- Redefined item analysis:
  - sends fuller item metadata
  - replaced saved analysis shape with:
    - `summary`
    - `contentAnalysis`
    - `tagSuggestions`
    - `topicSuggestions`
  - saves latest structured analysis result through the queue
  - updated analysis UIs to render the new structure
  - allowed tag application from saved analysis results

- Redefined scoring:
  - kept automatic `score_item` queueing on create
  - added manual per-item re-score route: `POST /api/ai/score/:id`
  - changed scoring output to:
    - `score`
    - `explanation`
    - `needsMoreInfo`
    - `moreInfoRequest`
  - stored score-specific fields on items, including:
    - needs-more-info flag
    - more-info request
    - model used
  - added manual `Re-score` action
  - kept deterministic boosts:
    - `Recent +50`
    - `Trending +100`

- Made the queue the operational source of truth:
  - kept all remaining AI work queue-driven
  - allowed queued and failed jobs to be deleted
  - allowed failed jobs to be retried
  - allowed completed jobs to be repeated
  - surfaced queue payloads, AI result summaries, and `modelUsed`
  - kept foreground queue processing for local/manual responsiveness

- Added model validation and prompt templates:
  - validated selected model in Settings
  - tested exact saved model against current Gemini key
  - added per-user prompt templates for:
    - Analyze
    - Score
  - prefilled prompt fields with defaults
  - made queue workers resolve saved prompts plus item context automatically
  - tightened model support to verified options only:
    - `gemini-2.5-flash-lite`
    - `gemini-3-flash-preview`
    - `gemma-3-27b-it`
  - removed unverified or unsupported model options
  - split backend handling by model family:
    - Gemini uses schema-based structured output
    - Gemma 3 uses prompt-guided JSON output and local parsing

---

### Explainer

Version 2.8 simplifies and hardens the AI layer.

Earlier versions had accumulated several overlapping AI behaviors: analysis, categorization, tag suggestion, direct ranking, and queue refreshes. This version reduces that surface to two clear capabilities only: Analyze and Scoring.

Analysis becomes the single structured item-interpretation surface, including summary, deeper content analysis, tag suggestions, and topic suggestions. Scoring becomes the structured recommendation surface, with support for uncertainty and explicit more-info requests when metadata is weak.

The queue becomes the visible operational layer for all remaining AI work, and Settings gains stronger model validation and prompt configurability. Model support is also tightened so the UI only exposes options the backend can actually handle reliably.

---

### Summary

Version 2.8 tightens the AI system.

It adds:
- a reduced AI surface centered on Analyze and Scoring
- structured saved analysis results
- richer structured scoring outputs
- queue-driven execution for all remaining AI work
- stronger model validation and saved prompt templates

At this point, AI becomes easier to understand, easier to trust, and easier to operate.

## Version 2.9

### Tasks

**Full-System Stabilization Pass**

- Added backend validation parity:
  - validated `contentType` on `POST /api/items`
  - validated `status` on `POST /api/items`
  - validated `contentType`, `status`, and `rating` on `PATCH /api/items/:id`
  - aligned single-item validation with existing CSV import rules
  - returned clear `400` responses for invalid values

- Cleaned up operational endpoints and leftovers:
  - moved `/api/health` above auth so it is publicly callable
  - removed stale `next_list:v1` cleanup behavior
  - removed outdated operational leftovers from maintenance paths

- Added backend-owned AI model registry:
  - replaced ad-hoc model lists with one backend source of truth
  - stored model metadata including:
    - `id`
    - `label`
    - `description`
    - `family`
    - `supportLevel`
    - capability mode
  - returned model registry from `/api/user/settings`
  - updated frontend Settings to render backend-provided models
  - kept `gemma-3-27b-it` available but explicitly marked `experimental`

- Hardened AI execution and validation:
  - upgraded model validation into real analyze/score smoke tests
  - kept Gemini on schema-based structured output
  - kept Gemma 3 on prompt-guided JSON output
  - improved JSON extraction and parsing for prompt-only outputs
  - exposed richer queue metadata:
    - model used
    - model family
    - support level
    - interest lines used

- Improved maintainability and smoke testing:
  - added repeatable API smoke-test script at `scripts/smoke-api.mjs`
  - wired smoke test through `pnpm smoke:api`
  - lazy-loaded heavy global overlays from the root route
  - kept `pnpm typecheck` and `pnpm build` as main repo-wide validation paths

---

### Explainer

Version 2.9 is a reliability and maintainability pass across the whole system.

By this point, the product was broad and capable, but a few foundational gaps still reduced trust. Validation was inconsistent between regular item creation and CSV import, operational paths still carried leftovers from older architectures, AI model definitions could drift between backend and frontend, and the root shell was loading more than it needed upfront.

This version addresses those issues by tightening validation, cleaning up operational behavior, centralizing AI model definitions in the backend, improving model testing, and adding a lightweight repeatable smoke-test path. It also reduces initial shell weight by lazy-loading heavier overlay components.

---

### Summary

Version 2.9 stabilizes the system.

It adds:
- stricter backend validation for regular item writes
- public health checks and operational cleanup
- a backend-owned AI model registry
- stronger AI execution validation and richer queue metadata
- smoke-test tooling and lighter root-shell loading

At this point, the app is safer, easier to monitor, and easier to maintain without changing its overall product direction.

## Version 3.0

### Tasks

**Core Product Expansion (Priority 0)**

- Added multi-source import system beyond CSV:
  - supported sources:
    - Goodreads
    - Letterboxd
    - IMDb
    - Trakt
    - Pocket
    - Raindrop
    - YouTube playlists/history
    - Apple Podcasts OPML
    - X bookmarks (where feasible)
  - introduced importer registry for consistent source integration
  - added import job tracking with status and metadata
  - stored source mapping data for created, duplicate, and failed rows
  - exposed import flows and recent jobs in the Add Item UI

- Added duplicate detection and merge system:
  - detected duplicates using:
    - source URL
    - external ID
    - fuzzy title + creator matching
  - added merge endpoint instead of silent duplication
  - applied duplicate detection to CSV and new import flows
  - added in-app duplicate review and merge UI (Settings)

- Added progress tracking per item:
  - new fields:
    - `progressPercent`
    - `progressCurrent`
    - `progressTotal`
    - `lastTouchedAt`
  - added progress editing on item page
  - displayed progress in dashboard in-progress sections
  - added type-aware progress behavior:
    - books → page-based progress
    - articles → reading progress
    - podcasts / YouTube / movies → minutes or consumed state
    - TV → episode/season progress
  - added quick progress presets (25%, 50%, 75%, Done)

- Added saved filters and smart views:
  - added `saved_views` backend storage and CRUD
  - enabled saving and reusing filters on collection pages
  - added smart-view visibility on dashboard
  - supported richer filters:
    - text query
    - minimum score
    - maximum duration
    - trending-only
    - status
  - enabled reusable filtered views such as:
    - short reads
    - high-score books
    - short podcasts
    - trending unstarted items

---

### Explainer

Version 3.0 is the first major expansion focused on real-world usability at scale.

Earlier versions built a strong foundation for tracking, organizing, and analyzing items. However, large gaps remained when users tried to migrate existing libraries, avoid duplication, track real progress, or navigate growing collections efficiently.

This version addresses those gaps directly.

The import system expands beyond CSV into structured file imports from major platforms. This makes it possible to bring in an existing media history without rebuilding it manually. At the same time, duplicate detection and merge flows ensure that large imports do not degrade data quality.

Progress tracking shifts the app from a passive library into an active consumption tool. Items now carry meaningful progress signals tailored to their media type, and the UI supports quick updates during normal use.

Finally, saved filters introduce reusable views over the library. Instead of relying only on status lists, users can define and revisit meaningful slices of their data, both on collection pages and the dashboard.

---

### Summary

Version 3.0 expands the core product for real usage.

It adds:
- multi-source import system with job tracking
- duplicate detection and merge workflows
- type-aware progress tracking across all media types
- saved filters and reusable smart views

At this point, the app supports full library migration, active consumption tracking, and scalable navigation of larger collections.

## Version 3.1

### Tasks

**Product Depth and Control (Priority 1)**

- Added custom collections / lists:
  - user-created lists with:
    - name
    - description
    - accent color
  - added ability to add/remove items from lists
  - enabled ordering of lists
  - enabled ordering of items within each list
  - kept lists structurally separate from tags

- Added reminder and resurfacing system:
  - introduced reminder types:
    - untouched for 30 days
    - stalled in-progress items
    - high-score suggestions not acted on
  - added `Reminder Inbox` on dashboard
  - added reminder management in Settings
  - supported:
    - dismiss
    - snooze (7 days)
  - built on existing queue and settings infrastructure

- Expanded notes into structured entries:
  - kept freeform notes
  - added structured note types:
    - highlight
    - quote
    - takeaway
    - reflection
  - allowed optional context fields such as:
    - chapter
    - timestamp
    - scene
    - reason/importance
  - enabled structured capture directly on item pages

- Added recommendation controls:
  - hide item from recommendations
  - manual boost
  - cooldown options:
    - 7 days
    - 30 days
    - clear cooldown
  - integrated controls into ranking logic for next-to-consume

---

### Explainer

Version 3.1 builds on the scalable foundation from Version 3.0 by adding more user control and deeper interaction with content.

The system moves beyond storing and organizing items into actively shaping how users engage with them.

Custom lists introduce curated collections that are distinct from tags. They allow users to intentionally group items and control ordering, which is important for planning and thematic organization.

The reminder system shifts the app from passive tracking to active resurfacing. Instead of relying on users to revisit items manually, the system highlights relevant content based on inactivity, score, and progress signals.

Structured notes expand the depth of engagement. Instead of a single note field, users can now capture different types of reflections in a more organized way, especially for content like books, podcasts, and articles.

Recommendation controls give users direct influence over ranking behavior. Items can be hidden, boosted, or temporarily suppressed, which makes the recommendation system more transparent and adjustable.

---

### Summary

Version 3.1 adds control, curation, and resurfacing.

It adds:
- user-created collections with ordering
- reminder system with inbox and snooze/dismiss controls
- structured notes for highlights, quotes, and reflections
- direct recommendation controls affecting ranking

At this point, the app supports not just tracking and importing content, but actively managing attention, reflection, and recommendations.

## Version 3.2

### Tasks

**Operational Improvements and Bulk Actions**

- Added background metadata resync system:
  - enabled resyncing metadata for imported items
  - queued resync jobs through the existing AI/queue system
  - avoided external API rate limits by processing in the background
  - reused queue infrastructure for safe, repeatable updates

- Added bulk selection and deletion system:
  - added `POST /api/items/bulk-delete` backend route
  - introduced `isSelectionMode` state in collection pages
  - enabled multi-select across all content types:
    - movies
    - TV
    - books
    - videos
    - podcasts
    - articles
    - tweets
  - added `SelectionOverlay` to item grids for visual selection state
  - added floating action bar for bulk delete actions

- Fixed item deletion UI bug:
  - resolved dropdown focus issue when deleting a single item
  - fixed conflict between custom item logic and Radix UI state handling

---

### Explainer

Version 3.2 focuses on operational efficiency and batch workflows.

After V3.1 added deeper product features like collections, reminders, and structured notes, this version improves how users manage larger datasets and imported content.

The metadata resync system allows imported items to be refreshed safely in the background. Instead of relying on immediate API calls, resync jobs are queued and processed gradually, which prevents rate-limit issues and keeps the system stable.

Bulk selection and deletion introduce a more scalable way to manage collections. Users can now select multiple items across any content type and perform actions on them together. This is especially important after large imports or when cleaning up duplicates and outdated entries.

The UI also becomes more consistent with selection overlays and a clear action bar, making bulk actions more discoverable.

---

### Summary

Version 3.2 improves batch operations and system reliability.

It adds:
- background metadata resync via the queue system
- bulk selection and deletion across all content types
- improved selection UI with overlays and action bar
- fix for item deletion dropdown behavior

At this point, the app better supports managing large libraries and maintaining imported data over time.

## Version 3.3

### Tasks

**TV Module Refinement**

- Updated the TV collection page to emphasize shows-only browsing:
  - changed the `/tv` page title to `Shows Only`
  - kept the dedicated TV poster grid experience
  - continued using TV-specific metadata for display

- Reworked TV metadata handling:
  - added structured TV metadata parsing utilities in the frontend
  - standardized season metadata shape to include:
    - `seasonNumber`
    - `episodeCount`
    - optional season title
    - optional air date
    - `finished` state
  - added serialization support so TV metadata can be safely updated and saved back to items

- Expanded TMDB TV ingest behavior:
  - changed TV metadata fetch to store full season lists instead of only a season count
  - excluded specials / season 0 from tracked seasons
  - kept per-season episode totals from TMDB
  - stored `seasonCount` alongside structured season data

- Improved TV search suggestions:
  - refined TMDB TV search flow to resolve detailed metadata for candidate shows
  - filtered TV suggestions so only shows with available seasons are returned
  - ensured selected TV suggestions carry season metadata into item creation

- Fixed Add Item persistence for richer metadata:
  - preserved fetched `metadata`, `externalId`, and `durationMins` during item creation
  - extended create/update item API contracts to support saving `metadata`
  - allowed metadata-aware updates for future TV progress changes

- Rebuilt TV item detail progress UX:
  - removed the old TV-specific `Episodes seen` / `Total episodes` editing model
  - replaced it with a per-season progress interface
  - displayed each season with its episode count
  - allowed each season to be marked as finished independently
  - showed season completion and total episode completion summary

- Connected TV season completion to item progress state:
  - recalculated total completed episodes from finished seasons
  - recalculated overall progress percentage automatically
  - updated item status based on season completion:
    - fully finished shows move to `finished`
    - partially completed shows move to `in_progress`
  - persisted `finishedAt` when all seasons are completed

- Updated TV poster badges:
  - changed TV cards to show season counts using the new structured metadata
  - used parsed metadata instead of raw JSON assumptions

---

### Explainer

Version 3.3 is a focused refinement of the TV module.

Earlier versions introduced TV support as part of the general media system, including poster-based browsing and basic progress tracking. However, the TV experience still treated shows too much like other media types by relying on generic current/total progress fields. That approach was functional, but it did not match how people actually track television.

This version reshapes TV around seasons as the primary unit of progress.

Instead of manually entering watched episode numbers, the app now stores structured per-season metadata and lets the user mark each season as finished. That creates a more natural workflow for television, while still preserving aggregate progress values for dashboards, reminders, and recommendation logic.

The ingest flow is also improved so the app captures richer TV data at creation time. TMDB results now save real season breakdowns rather than only a single season count, and search suggestions are filtered to avoid incomplete or unusable TV results.

Overall, this version does not introduce a brand-new product area. It deepens one existing area so that TV behaves like a first-class content type with its own tracking model, rather than a thin adaptation of the generic progress system.

---

### Summary

Version 3.3 refines the TV module into a season-based tracking system.

It adds:
- a `Shows Only` TV browsing page
- structured season metadata for TV items
- TV suggestions limited to shows with available seasons
- season-by-season completion tracking on item pages
- automatic episode totals, progress percent, and status updates
- richer TMDB TV metadata saved during item creation

At this point, the TV experience is no longer just poster browsing with generic progress fields. It becomes a dedicated show-tracking workflow built around seasons, completion state, and better metadata quality.

## Version 3.4

### Tasks

**Labs-Gated Feature Simplification**

- Added Labs feature flags to per-user settings:
  - `lists`
  - `reminders`
  - `smartViews`
- Stored Labs state inside the existing user settings JSON blob
- Defaulted all three Labs flags to `false` when absent
- Exposed Labs state through the existing user settings API
- Added update support for Labs flags without introducing a schema migration

- Added a new `Labs` tab in Settings:
  - toggle for Lists
  - toggle for Reminders
  - toggle for Smart Views
- Added explanatory copy clarifying that:
  - these features are optional / experimental
  - disabling them hides the feature but preserves stored data

- Gated Lists end-to-end:
  - hid `/lists` from sidebar navigation when disabled
  - blocked list-related frontend queries when disabled
  - removed the Lists widget from the full item detail page when disabled
  - changed the Lists route to a disabled-state screen when the feature is off
  - gated backend `/api/lists` access with a consistent `403` disabled response
  - preserved all list tables and stored list membership data

- Gated Reminders end-to-end:
  - removed the Reminder Inbox widget from the dashboard when disabled
  - removed the Reminders tab from Settings when disabled
  - blocked reminder-related frontend queries when disabled
  - gated backend `/api/reminders` access with a consistent `403` disabled response
  - preserved reminder state data in the database

- Gated Smart Views end-to-end:
  - removed the dashboard Smart Views shelf when disabled
  - removed saved-view controls from collection pages when disabled
  - blocked saved-view frontend queries when disabled
  - gated backend `/api/views` access with a consistent `403` disabled response
  - preserved saved-view rows in the database

- Added shared Labs support in the frontend:
  - shared `LabsSettings` type
  - shared Labs update API
  - shared Labs hook for reading the current user’s feature flags
- Used one shared Labs state source to drive conditional rendering across the app

- Verified unrelated product areas remained unchanged:
  - item CRUD
  - imports
  - scoring / next-to-consume
  - tags
  - notes
  - progress tracking
  - TV module

---

### Explainer

Version 3.4 is a product-simplification release.

Earlier versions added significant product depth, especially around organization and resurfacing. Lists, reminders, and smart views were all useful features on their own, but together they also added more surface area to the app’s default experience than was needed at this stage.

This version addresses that by introducing a Labs system instead of hard-removing those features.

Rather than deleting functionality or performing destructive schema cleanup, the app now treats these three areas as optional product modules. They are turned off by default for every user, which immediately reduces visual and mental clutter in the main experience. At the same time, the underlying data is preserved, and each feature can be brought back by enabling it from Settings.

This is important because it keeps the product flexible. The app becomes simpler for default day-to-day use, while still allowing experimental or lower-priority features to remain available for future testing and iteration.

Version 3.4 also makes the disabled state real rather than cosmetic. The frontend hides those surfaces, but the backend also blocks direct access to the related endpoints when the corresponding Labs flag is off. That keeps the system behavior consistent and prevents hidden features from continuing to operate in the background.

Overall, this version is less about adding new user-facing capability and more about improving focus. It reduces bloat, creates a cleaner default product shape, and establishes a controlled way to keep optional features without letting them dominate the main workflow.

---

### Summary

Version 3.4 introduces Labs-based feature gating for lower-priority product areas.

It adds:
- per-user Labs flags for Lists, Reminders, and Smart Views
- a new Labs page in Settings
- frontend and backend gating for those three features
- preservation of all existing data while defaulting the features off

At this point, the app becomes more focused by default while still retaining the ability to re-enable experimental organizational features when needed.

## Version 3.5

### Tasks

**Surface Consolidation and Settings Simplification**

- Simplified recommendation surfaces:
  - kept the dashboard `Next To Consume` section as the primary recommendation experience
  - removed the duplicate topbar `Next To Consume` entry point
  - removed the extra app-shell modal wiring for recommendation browsing

- Simplified item detail surfaces:
  - kept the full page item detail route as the primary item experience
  - removed the global item detail overlay from the app shell
  - changed global search item selection to navigate directly to the full item page
  - removed duplicate shell-level detail state and overlay plumbing

- Reduced Settings complexity:
  - removed `Duplicates` from the main Settings tab bar
  - removed `Reminders` from the default Settings experience when the feature is disabled
  - replaced the old `AI Model` tab with a broader `Advanced` tab
  - moved model selection into `Advanced`
  - moved AI prompt template editing into `Advanced`
  - kept queue timing and AI diagnostics in `Advanced`
  - added clearer copy framing those controls as advanced tuning rather than core product workflow

- Cleaned up dead or duplicate UI systems:
  - removed the unused legacy board view
  - removed the unused legacy grid view
  - removed the unused legacy item card workflow tied to that older board/grid system
  - removed the now-unused topbar recommendation panel component
  - removed the now-unused overlay item detail panel component
  - removed the unused `@dnd-kit` dependencies that only supported those deleted surfaces

---

### Explainer

Version 3.5 continues the simplification work started in Version 3.4, but it does so by removing duplicated product surfaces rather than feature-gating optional modules.

Before this release, the app still had several parallel ways to do the same thing. Recommendations could be accessed from both the dashboard and the topbar. Item details could be opened both as a full page and as a global overlay. Settings also mixed normal user preferences with advanced AI tuning and operational review workflows. On top of that, older board/grid-era UI components were still present in the codebase even though they no longer matched the product direction.

This version tightens that structure.

The dashboard is now the single recommendation home, and the full item page is now the single item-detail experience. That reduces maintenance cost, removes conflicting UX patterns, and makes the product easier to understand because each major workflow now has one obvious place to live.

Settings also become cleaner in this release. Instead of presenting AI model controls and prompt editing as standard settings, those capabilities now live under an `Advanced` section. They are still available, but they no longer compete visually with the product’s more important day-to-day controls.

Finally, this version removes dead interface systems that belonged to an earlier stage of the app’s evolution. That is valuable not only for UI clarity, but also for implementation clarity. The codebase now has fewer stale components, fewer redundant dependencies, and fewer leftover patterns pulling the product in different directions.

Overall, Version 3.5 is about choosing one canonical surface for each major workflow and cutting away the duplicates.

---

### Summary

Version 3.5 consolidates the app around fewer, clearer product surfaces.

It adds:
- one primary recommendation surface on the dashboard
- one primary full-page item detail experience
- a cleaner Settings layout with advanced AI controls grouped under `Advanced`
- removal of legacy board/grid-era UI remnants and their unused dependencies

At this point, the app becomes easier to navigate, easier to maintain, and more aligned with the product’s intended `Capture / Decide / Consume` flow.
