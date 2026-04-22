# SirajHub — Product Roadmap Ideas

## Guiding Direction

SirajHub should be shaped around three core loops:

- Capture
- Decide
- Consume

Everything we add should clearly strengthen one of those loops. Anything that does not directly support them should either be simplified, hidden behind advanced settings, or dropped.

---

## Phase 1 — Focus and Simplification

### Goal

Reduce fragmentation, make the product easier to understand, and strengthen the core daily workflow before adding more breadth.

### Tasks

#### P1.1 — Define the Main Product Loop

- [x] Reframe the product internally around:
  - Capture
  - Decide
  - Consume
- [x] Audit current pages and features against those three loops
- [x] Mark each current feature as:
  - core
  - advanced
  - candidate for removal

#### P1.2 — Simplify Recommendation Surfaces

- [ ] Choose one primary `Next To Consume` experience
- [ ] Keep recommendation cards on the dashboard as the main surface
- [ ] Decide whether the topbar `Next To Consume` modal should:
  - become a dedicated route
  - scroll to the dashboard section
  - be removed entirely
- [ ] Remove duplicate recommendation UI patterns where possible

#### P1.3 — Simplify Item Detail Surfaces

- [ ] Choose one primary item-detail experience
- [ ] Keep the full page item detail route as the main editing surface
- [ ] Decide whether the global detail sheet should:
  - become read-only
  - become a lightweight preview
  - be removed
- [ ] Reduce duplicated item-detail logic between the full page and overlay sheet

#### P1.4 — Reduce Settings Complexity

- [ ] Move operational workflows out of Settings:
  - reminders
  - duplicates
  - queue tasks
- [ ] Keep Settings focused on:
  - account
  - theme
  - API keys
  - core preferences
- [ ] Move model selection behind an `Advanced` section
- [ ] Move AI prompt template editing behind an `Advanced` section or remove it from normal user flows

#### P1.5 — Clean Up Legacy / Dead Surfaces

- [ ] Audit whether the legacy board/grid flow is still intentionally part of the product
- [ ] If not, remove dead or zombie UI systems such as:
  - legacy board view
  - legacy grid view
  - unused item card workflows
- [ ] Remove stale navigation and components that no longer support the intended product direction

---

## Phase 2 — Unified Inbox and Triage

### Goal

Turn the scattered “things needing attention” into one high-value operational page.

### Tasks

#### P2.1 — Build a Unified Inbox Page

- [ ] Add a dedicated `Inbox` or `Review` route
- [ ] Aggregate all action-needed items into one place:
  - new suggestions
  - stalled in-progress items
  - reminder candidates
  - duplicate candidates
  - import failures
  - items with missing metadata
  - items waiting on scoring or metadata refresh

#### P2.2 — Make Inbox Actionable

- [ ] Add quick actions directly in the inbox:
  - start now
  - dismiss / not now
  - hide from recommendations
  - boost
  - merge duplicate
  - retry metadata
  - retry score
- [ ] Let users resolve issues without bouncing between many pages

#### P2.3 — Move Existing Workflows Into Inbox

- [ ] Move duplicate review out of Settings into Inbox or a dedicated review flow
- [ ] Move reminders out of Settings into Inbox-first handling
- [ ] Surface import cleanup results in Inbox after bulk import jobs finish
- [ ] Treat queue failures as actionable review items rather than buried settings data

---

## Phase 3 — Stronger Recommendation Workflow

### Goal

Make recommendations feel interactive and useful in the moment, not just informative.

### Tasks

#### P3.1 — Add Direct Recommendation Actions

- [ ] Add quick actions on recommendation cards:
  - start now
  - not now
  - hide
  - boost
  - add to list
- [ ] Let users act on recommendation results without opening the item page first

#### P3.2 — Unify Personalization

- [ ] Review overlap between:
  - freeform taste profile
  - per-type interest profiles
- [ ] Merge them into one clearer recommendation preference system
- [ ] Keep global preferences plus optional per-type refinement instead of two parallel mental models

#### P3.3 — Improve Recommendation Transparency

- [ ] Show clearer reasons for why an item is recommended
- [ ] Show active controls affecting rank:
  - recent boost
  - trending boost
  - manual boost
  - cooldown
  - hidden state
- [ ] Add simpler language so scoring is understandable without reading internal AI terminology

---

## Phase 4 — Better Consume / Resume Loop

### Goal

Help users continue active items effortlessly and record progress in a natural way.

### Tasks

#### P4.1 — Improve Resume Experience

- [ ] Add one-click `Resume` actions on in-progress items
- [ ] Add `last touched` sorting to in-progress surfaces
- [ ] Highlight recently active items more clearly on the dashboard
- [ ] Add “continue where you left off” entry points on type pages

#### P4.2 — Add Quick Progress Actions

- [ ] Add lightweight progress controls directly on cards where useful
- [ ] Support media-specific quick updates such as:
  - books → `+10 pages`
  - articles → `+5 min`
  - podcasts / videos → `+10 min`
  - TV → next episode / next season flow
- [ ] Reduce the need to open the full detail page for simple progress updates

#### P4.3 — Expand Progress History

- [ ] Add basic progress history / touch history per item
- [ ] Show when an item was last resumed or updated
- [ ] Use history to improve reminders and resume suggestions

#### P4.4 — Continue Improving Type-Specific Progress

- [ ] Keep refining TV season tracking
- [ ] Improve book reading progress ergonomics
- [ ] Improve podcast and video progression UX
- [ ] Make per-type progress feel native rather than generic

---

## Phase 5 — Better Capture and Import Workflow

### Goal

Make adding content faster and make imports easier to clean up afterward.

### Tasks

#### P5.1 — Add Frictionless Capture

- [ ] Add browser extension and/or bookmarklet support
- [ ] Add mobile/PWA share-to-app capture if feasible
- [ ] Add a lightweight “paste anything” quick-capture field in the app shell
- [ ] Reduce the need to open the full Add Item dialog for every save

#### P5.2 — Improve Add Item UX

- [ ] Simplify the Add Item dialog so the common flow is faster
- [ ] Separate:
  - quick capture
  - structured manual add
  - heavy import workflows
- [ ] Reduce cognitive overload in the multi-mode add experience

#### P5.3 — Build Post-Import Cleanup Flow

- [ ] Add a guided review flow after imports complete
- [ ] Let users review:
  - duplicates
  - missing metadata
  - type mismatches
  - missing covers / creators / dates
  - default statuses
- [ ] Add optional “rescore imported items” actions after cleanup

#### P5.4 — Rationalize Import Sources

- [ ] Review which importers provide the highest real product value
- [ ] Prioritize maintaining strong sources such as:
  - Goodreads
  - Letterboxd
  - IMDb
  - Trakt
  - Pocket
  - Raindrop
- [ ] Deprioritize brittle or low-value importers if they create ongoing maintenance cost

---

## Phase 6 — Stronger Notes and Knowledge Layer

### Goal

Turn notes from a hidden per-item feature into a meaningful product layer.

### Tasks

#### P6.1 — Surface Notes Beyond the Item Page

- [ ] Add a recent highlights / notes feed
- [ ] Surface notebook activity on the dashboard
- [ ] Let users browse notes across items instead of only inside one item

#### P6.2 — Improve Structured Note Discovery

- [ ] Add filtering by note type:
  - highlight
  - quote
  - takeaway
  - reflection
- [ ] Add search across notes and highlights
- [ ] Allow browsing notes by media type, list, and tag

#### P6.3 — Add Export / Summary Workflows

- [ ] Export notes for a list or content type
- [ ] Generate item-level and list-level reading / watching summaries from notes
- [ ] Build toward a real personal knowledge layer instead of isolated note entries

---

## Phase 7 — Stronger Lists and Planning

### Goal

Make lists feel like a planning tool, not just a side feature.

### Tasks

#### P7.1 — Improve List Utility

- [ ] Add alternative list layouts:
  - compact list
  - poster/cover grid
- [ ] Improve item reordering ergonomics
- [ ] Add faster add/remove flows for lists

#### P7.2 — Add List-Level Metadata

- [ ] Add optional list metadata such as:
  - target date
  - season / timeframe
  - theme
  - purpose
- [ ] Show progress and momentum at the list level

#### P7.3 — Add Smart / Hybrid Lists

- [ ] Explore rule-based lists
- [ ] Allow hybrid lists that combine:
  - manual curation
  - smart filters
- [ ] Add “next item in this list” recommendations

---

## Phase 8 — Search and Command Layer

### Goal

Turn search into a fast control center, not just a lookup dialog.

### Tasks

#### P8.1 — Upgrade Global Search Into Command Search

- [ ] Add quick actions from search results:
  - move to status
  - add to list
  - remove from list
  - hide from recommendations
  - mark finished
  - open notes
- [ ] Keep search as a keyboard-first power workflow

#### P8.2 — Add Faster Navigation and Capture Commands

- [ ] Add commands for:
  - quick add
  - open inbox
  - open current in-progress items
  - jump to lists
  - create a new list
- [ ] Make search feel like the app’s command center

---

## Phase 9 — Analytics and Deeper Product Intelligence

### Goal

Add richer reflection and insight once the core loops are stable.

### Tasks

#### P9.1 — Richer Dashboard / Analytics

- [ ] Add weekly and monthly consumption trends
- [ ] Show completion rate by type
- [ ] Show backlog growth vs completed work
- [ ] Surface top tags/topics over time

#### P9.2 — Calendar / Timeline View

- [ ] Show added / started / finished / abandoned activity over time
- [ ] Use it as a retrospective and habit-review surface

#### P9.3 — Item Linking

- [ ] Add relationships between items such as:
  - book ↔ movie adaptation
  - article ↔ podcast episode
  - tweet ↔ article thread
  - sequel / prequel / same creator

#### P9.4 — AI Knowledge Layer

- [ ] Add cross-item insight features based on:
  - notes
  - highlights
  - tags
  - linked items
- [ ] Explore theme detection and pattern surfacing across the library

---

## Phase 10 — Longer-Term / Optional

### Goal

Keep these visible, but treat them as post-focus expansions rather than near-term priorities.

### Tasks

- [ ] Archive / restore / soft delete flows
- [ ] Collaboration / shared lists
- [ ] Public profiles / shareable views
- [ ] Multi-user recommendation modes
- [ ] Stronger offline-first / local-first behavior

---

## Candidate Features To Drop or Hide

These are not immediate removals, but they should be reconsidered before more feature expansion.

- [ ] Hide raw AI model selection behind advanced settings
- [ ] Hide AI prompt template editing behind advanced settings
- [ ] Remove or simplify duplicate item-detail surfaces
- [ ] Remove or simplify duplicate recommendation surfaces
- [ ] Audit and remove legacy board/grid systems if no longer core
- [ ] Move non-settings operational workflows out of Settings

---

## Working Principle

Before adding any new feature, ask:

- [ ] Does this improve capture?
- [ ] Does this improve deciding what to consume?
- [ ] Does this improve active consumption or reflection?
- [ ] If not, should it be postponed, hidden, or removed?
