# SirajHub Changelog

This end-user changelog covers the full project history, from the first plan on April 14, 2026 through the current v4.03 release. Entries are intentionally brief. Versions marked `*` were not named in Git and were assigned during this audit according to their timeline.

## v4

| Version | Date | User-facing changes |
|---|---|---|
| 4.03 | 2026-09-20 | Published a complete version history and a concise, current setup, usage, and maintenance guide; archived superseded planning documents. |
| 4.02 | 2026-08-23 | Simplified the book page-count display and made the missing-count action more accurate. |
| 4.01 | 2026-08-23 | Corrected the missing book page-count counter. |
| 4.0 | 2026-08-23 | Introduced a more compact collection header with clearer status, filter, sort, and selection controls. |

## v3

| Version | Date | User-facing changes |
|---|---|---|
| 3.99b | 2026-08-23 | Applied a final Books page spacing fix. This was the second Git release named v3.99. |
| 3.99 | 2026-08-23 | Tightened the Books grid layout and its integration with the collection page. |
| 3.98 | 2026-08-23 | Replaced the experimental 3D bookshelf with a faster, cleaner book grid. |
| 3.97 | 2026-08-18 | Improved navigation and book-cover presentation, including generated spine artwork. |
| 3.96 | 2026-08-18 | Improved bookshelf responsiveness, controls, and layout behavior. |
| 3.95 | 2026-08-18 | Fixed bookshelf rendering and interaction edge cases. |
| 3.94 | 2026-08-18 | Improved shelf rendering and added more reliable book page-count lookup support. |
| 3.93 | 2026-08-18 | Fixed bookshelf spacing and book placement. |
| 3.92 | 2026-08-18 | Stabilized the new bookshelf scene and its third-party assets. |
| 3.91 | 2026-08-18 | Revamped Books with page counts, automated page lookup, import support, and a new visual shelf experience. |
| 3.9 | 2026-08-18 | Replaced the old rating scale with a consistent seven-star system; imported ratings are converted automatically. |
| 3.88 | 2026-08-17 | Fixed direct links and browser refreshes returning 404 on app subpages. |
| 3.87 | 2026-06-16 | Refined bookshelf sizing and responsive behavior. |
| 3.86 | 2026-06-16 | Corrected bookshelf visual alignment. |
| 3.85 | 2026-06-16 | Improved bookshelf layout and responsiveness. |
| 3.84 | 2026-06-16 | Optimized bookshelf rendering and navigation. |
| 3.83 | 2026-06-16 | Fixed Add/Import modal layout and interaction issues. |
| 3.82 | 2026-05-24 | Improved password compatibility and authentication reliability. |
| 3.81 | 2026-05-16 | Added TV metadata resync while preserving watched-season progress. |
| 3.8 | 2026-05-16 | Added richer sorting and filtering to media pages and saved views. |
| 3.75 | 2026-05-14 | Reverted an incompatible AI-model workaround to restore stable analysis. |
| 3.73 | 2026-05-14 | Updated supported AI models and model-family handling. |
| 3.72 | 2026-05-13 | Applied a small import-dialog layout correction. |
| 3.71 | 2026-05-13 | Polished spacing and alignment across the import dialog. |
| 3.7 | 2026-05-13 | Reorganized Add Item into a clearer, preview-first import experience. |
| 3.6 | 2026-05-13 | Added direct YouTube playlist import with preview and duplicate-safe saving. |
| 3.5 | 2026-04-23 | Removed duplicate legacy views and panels, simplifying navigation around the dashboard and full item page. |
| 3.4 | 2026-04-23 | Added Labs switches for Lists, Reminders, and Smart Views; disabling a Lab hides it without deleting data. |
| 3.32 | 2026-04-23 | Expanded user documentation for the TV workflow. |
| 3.31 | 2026-04-23 | Fixed TV season normalization. |
| 3.3 | 2026-04-23 | Added TV season and episode metadata, season completion controls, automatic progress, and poster-grid improvements. |
| 3.26 | 2026-04-18 | Consolidated and cleaned up project documentation. |
| 3.25 | 2026-04-18 | Fixed podcast import metadata handling. |
| 3.241 | 2026-04-18 | Fixed a progress-entry edge case in Add Item. |
| 3.24 | 2026-04-18 | Improved progress tracking fields, calculations, and editing. |
| 3.23 | 2026-04-18 | Fixed import-result handling in the frontend. |
| 3.22 | 2026-04-18 | Polished Settings and general UI styling. |
| 3.21 | 2026-04-18 | Added metadata resync, multi-select, and bulk delete across media pages. |
| 3.2 | 2026-04-17 | Refreshed the dashboard, item detail, and media layouts for clearer day-to-day use. |
| 3.14 | 2026-04-17 | Improved file import parsing, mapping, duplicate handling, and validation. |
| 3.13 | 2026-04-17 | Fixed imported book metadata. |
| 3.12 | 2026-04-17 | Fixed creation of new items. |
| 3.11 | 2026-04-17 | Improved item-detail layouts and controls. |
| 3.1 | 2026-04-17 | Added ordered custom lists, reminders with snooze/dismiss, structured notes, and recommendation controls. |
| 3.0 | 2026-04-17 | Added multi-source imports, duplicate detection/merge, media progress tracking, import history, and saved Smart Views. |

## v2

| Version | Date | User-facing changes |
|---|---|---|
| 2.9 | 2026-04-17 | Hardened validation and AI execution, added model diagnostics and API smoke testing, and improved startup performance. |
| 2.81 | 2026-04-17 | Clarified supported and experimental AI models in Settings. |
| 2.8 | 2026-04-16 | Focused AI on structured item analysis and scoring, with prompt templates and a visible job queue. |
| 2.72 | 2026-04-16 | Fixed AI queue status and controls in Settings. |
| 2.71 | 2026-04-16 | Fixed background AI queue processing. |
| 2.7 | 2026-04-16 | Updated navigation and layouts across every media section and Settings. |
| 2.61 | 2026-04-16 | Fixed saving interest profiles. |
| 2.6 | 2026-04-16 | Added weighted, per-media interest profiles and an explainable recommendation score. |
| 2.5 | 2026-04-16 | Added light, dark, and system theme support. |
| 2.4 | 2026-04-16 | Added bulk CSV import with validation and a result summary. |
| 2.3 | 2026-04-16 | Improved article presentation, item editing, and AI queue reliability. |
| 2.2 | 2026-04-16 | Added per-user API keys, queued AI work, richer metadata, and broader recommendation/analysis controls. |

## v1

| Version | Date | User-facing changes |
|---|---|---|
| 1.4 | 2026-04-15 | Refined dashboard and collection-page layouts. |
| 1.3 | 2026-04-15 | Applied a broad visual polish pass across login, dashboard, item pages, search, AI, and Settings. |
| 1.2 | 2026-04-15 | Redesigned the app shell and improved AI behavior and add-item flows. |
| 1.1 | 2026-04-15 | Introduced the current dashboard/sidebar structure, dedicated media pages, item detail pages, and expanded settings. |

## v0

| Version | Date | User-facing changes |
|---|---|---|
| 0.71 | 2026-04-15 | Updated AI prompts and response handling. |
| 0.7 | 2026-04-15 | Added automatic AI processing after capture and improved item/search workflows. |
| 0.6 | 2026-04-15 | Added grid view, type/tag filters, global search, tags, profile settings, data export, and mobile improvements. |
| 0.5 | 2026-04-15 | Added AI item analysis and ranked “Next to Consume” recommendations. |
| 0.45* | 2026-04-15 | Removed temporary authentication diagnostics and tightened trusted origins. |
| 0.44 | 2026-04-15 | Corrected API authentication routing. |
| 0.43 | 2026-04-15 | Fixed authentication request handling. |
| 0.42 | 2026-04-15 | Fixed session middleware and auth integration. |
| 0.41 | 2026-04-15 | Fixed Add Item and board interaction issues. |
| 0.4 | 2026-04-15 | Added item management plus URL/search metadata capture for books, movies, TV, podcasts, YouTube, articles, and posts. |
| 0.2.1* | 2026-04-14 | Fixed a login form fallback under strict TypeScript checks. |
| 0.2* | 2026-04-14 | Added email/password sign-up, sign-in, persistent sessions, logout, and protected user data. |
| 0.1.7* | 2026-04-14 | Restricted cross-origin access to approved origins. |
| 0.1.6* | 2026-04-14 | Fixed production deployment to use the Worker bundle generated by Vite. |
| 0.1.5* | 2026-04-14 | Added the first plain-language project guide. |
| 0.1.4* | 2026-04-14 | Updated deployment automation to Node.js 24. |
| 0.1.3* | 2026-04-14 | Connected the configured Cloudflare D1 database and KV namespace. |
| 0.1.2* | 2026-04-14 | Corrected the automated Cloudflare deployment command. |
| 0.1.1* | 2026-04-14 | Fixed Vite configuration portability. |
| 0.1* | 2026-04-14 | Created the React/Worker monorepo, D1 schema, KV cache, local development flow, health endpoint, and automated deployment. |
| 0.0 | 2026-04-14 | Added the original product and implementation plan; no runnable product yet. |
