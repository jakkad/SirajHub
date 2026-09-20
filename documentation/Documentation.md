# SirajHub User and Maintenance Guide

Documentation version: **4.03** (September 20, 2026)

SirajHub is a private media library for capturing, organizing, prioritizing, and tracking books, movies, TV shows, podcasts, YouTube videos, articles, and posts. It runs as a React application and Cloudflare Worker backed by D1 and KV.

## Start the project locally

### Requirements

- Node.js 24 (recommended; this is the CI version)
- pnpm 9+
- A Cloudflare account and Wrangler login for production work

### First-time setup

1. Install dependencies from the repository root:

   ```bash
   pnpm install
   ```

2. Create a root `.dev.vars` file. At minimum, set a long random authentication secret. Add provider keys for every integration you want to use:

   ```dotenv
   AUTH_SECRET=replace-with-a-long-random-secret
   GEMINI_API_KEY=
   TMDB_API_KEY=
   YOUTUBE_API_KEY=
   GOOGLE_BOOKS_API_KEY=
   PODCAST_INDEX_KEY=
   PODCAST_INDEX_SECRET=
   ```

   Provider keys may instead be saved per user in **Settings → API Keys**. Open Library, iTunes, article scraping, and X/Twitter oEmbed can cover some metadata without a dedicated key; Gemini, TMDB, YouTube, Google Books fallback, and Podcast Index features need their matching key.

3. Create the local database tables:

   ```bash
   pnpm db:migrate:local
   ```

4. Start the full frontend and Worker stack:

   ```bash
   pnpm dev
   ```

5. Open the local URL printed by Vite (normally `http://localhost:5173`), create an account, and sign in.

Local D1 data is persisted under `apps/web/.wrangler/state`. The development server uses `wrangler.toml`, so no separate backend process is required.

## Use SirajHub

### Capture content

Use **Add Item** and choose the most suitable method:

- **URL:** paste a supported YouTube, TMDB, Goodreads/Open Library/Google Books, podcast, X/Twitter, or article URL. SirajHub detects the type and fills available metadata.
- **Search:** search by name for books, movies, TV shows, or podcasts, then review the result before saving.
- **Manual:** enter the title, type, status, creator, cover, source, description, rating, progress, and book page count yourself.
- **Import:** upload a generic CSV or an export from Goodreads, Letterboxd, IMDb, Trakt, Pocket, Raindrop, YouTube history, Apple Podcasts OPML, or X bookmarks. JSON, HTML, XML/OPML, and CSV are accepted where appropriate. You can map unfamiliar columns manually.
- **YouTube playlist:** paste a playlist URL, fetch its entries, review the preview, and import the videos or podcast episodes.

Imports show valid rows and errors before saving. Potential duplicates are skipped and reported rather than silently copied.

### Browse and prioritize

- The **Dashboard** shows library totals, recently added items, current progress, reminders, Smart Views, and “Next to Consume” recommendations when those features are enabled.
- Use the sidebar to open a media-specific page. Filter by status, search text, rating, score, duration, or trending state, then sort by updated/added/finished date, rating, score, title, creator, or release date.
- Save a useful filter as a **Smart View** for reuse. Enable Smart Views in **Settings → Labs** first.
- Press **Cmd+K** on macOS or **Ctrl+K** elsewhere to search the library quickly.
- Use light, dark, or system appearance from the theme control.

Every item uses one of four states: **Suggestions**, **In Progress**, **Finished**, or **Archived**. Ratings use the current 1–7 star scale. Imported 5- or 10-point ratings are converted automatically.

### Work with an item

Open an item to:

- edit its metadata, status, rating, and private notes;
- track progress by page, episode, minute, or percentage as appropriate;
- mark individual TV seasons finished and resync newly released seasons without losing existing progress;
- check or manually enter a book's page count;
- add colored tags and, when enabled, ordered custom lists;
- record structured highlights, quotes, takeaways, and reflections;
- run AI analysis and view its saved result;
- hide it from recommendations, apply a manual boost, or set a 7/30-day cooldown;
- resync remote metadata when the saved information is stale.

On a media page, choose **Select** to delete several items at once. Deletion is permanent, so export a backup first.

### Optional Labs

Open **Settings → Labs** to enable:

- **Lists:** ordered personal collections with names, descriptions, colors, and manually ordered items.
- **Reminders:** resurfaces stale suggestions, stalled items, and strong recommendations; reminders can be snoozed for seven days or dismissed.
- **Smart Views:** reusable advanced filters on the dashboard and collection pages.

Turning a Lab off only hides it; its saved data remains available if re-enabled.

### Personalize recommendations and AI

In **Settings**:

- **Profile:** update your display name and general taste profile.
- **Interests:** add weighted interests separately for each media type. These influence AI scoring.
- **API Keys:** save and test personal provider keys.
- **Advanced:** select/test a supported AI model, change queue timing, edit analysis/scoring prompts, inspect jobs, and retry, repeat, or delete eligible jobs.

AI analysis and scoring run through a background queue. Production also invokes queue processing every 15 minutes; newly queued work can therefore take time to appear.

## Basic maintenance

### In-app maintenance

- **Back up items:** use **Settings → Data → Export** to download JSON. The export contains items only; it is not a full database backup of accounts, tags, lists, views, reminders, or AI jobs.
- **Manage tags:** delete unused tags from **Settings → Tags**. Removing a tag does not delete its items.
- **Repair metadata:** use item/media resync. Books also provide a missing-page-count action; TV provides season resync.
- **Reset AI results:** clear the AI cache from **Settings → Data**. This removes saved analyses and queued jobs for your items, not the items themselves.
- **Export before deletion:** single and bulk item deletes are permanent; there is no trash/restore flow.

### Validate a code change

Run these from the repository root:

```bash
pnpm typecheck
pnpm build
```

With the app running, check the public health endpoint and optionally authenticated APIs:

```bash
BASE_URL=http://localhost:5173 pnpm smoke:api
BASE_URL=http://localhost:5173 SESSION_COOKIE='your-cookie' pnpm smoke:api
```

### Database changes

After changing `worker/src/db/schema.ts`, generate a migration, review the SQL, and apply it locally:

```bash
pnpm db:generate
pnpm db:migrate:local
```

Apply reviewed migrations to production with:

```bash
pnpm db:migrate
```

Do not edit an already-applied migration. Back up production before schema changes.

### Production configuration and deployment

For a new Cloudflare account, create a D1 database named `sirajhub-db` and a KV namespace, then replace their IDs in `wrangler.toml`. Store production secrets with Wrangler, one at a time:

```bash
pnpm exec wrangler secret put AUTH_SECRET
pnpm exec wrangler secret put GEMINI_API_KEY
pnpm exec wrangler secret put TMDB_API_KEY
pnpm exec wrangler secret put YOUTUBE_API_KEY
pnpm exec wrangler secret put GOOGLE_BOOKS_API_KEY
pnpm exec wrangler secret put PODCAST_INDEX_KEY
pnpm exec wrangler secret put PODCAST_INDEX_SECRET
```

Deploy manually with:

```bash
pnpm deploy
pnpm db:migrate
```

Pushing to `main` also triggers GitHub Actions to install dependencies, build, deploy the generated Worker bundle/static assets, and apply production migrations. Configure repository secrets `CF_API_TOKEN` and `CF_ACCOUNT_ID` before relying on this workflow.

### Routine checklist

1. Export item data and maintain an independent D1 backup before risky work.
2. Update dependencies deliberately and commit the lockfile.
3. Run `pnpm typecheck` and `pnpm build`.
4. Apply migrations locally and test sign-in, capture, edit, import, and direct subpage refresh.
5. Deploy, apply production migrations, and verify `/api/health` plus one authenticated request.
