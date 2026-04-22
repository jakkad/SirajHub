# SirajHub — V3.4 Product Audit

## Purpose

This document starts **V3.4 / Phase 1.1** from [Ideas.md](/Users/Jake/Coding/SirajHub/Ideas.md).

The goal is to audit the current product against SirajHub's intended three-loop model:

- **Capture**
- **Decide**
- **Consume**

Each current feature or surface is marked as one of:

- **Core**
- **Advanced**
- **Candidate for Removal**

This audit is meant to guide upcoming product simplification work before adding more breadth.

---

## Main Product Loop

### 1. Capture

Capture is how content enters SirajHub.

This includes:

- quick add
- metadata ingest
- search-based add
- imports
- metadata repair / resync

### 2. Decide

Decide is how the user determines what deserves attention next.

This includes:

- suggestions
- recommendation scoring
- next-to-consume surfaces
- reminders / resurfacing
- lists
- smart views / saved filters

### 3. Consume

Consume is how the user actively tracks progress and reflection once an item matters.

This includes:

- progress tracking
- in-progress surfaces
- TV season completion
- notes and highlights
- item detail workflows

---

## Product-Level Assessment

SirajHub is already strong in breadth. It can:

- ingest and import many content types
- track progress across different media
- score recommendations
- organize items with tags, lists, and saved views
- store notes and highlights
- resurface forgotten items

The current issue is not lack of capability. The issue is **fragmentation**.

The product currently behaves like three apps sharing one database:

- a personal media inbox/tracker
- an AI recommendation workbench
- a migration / cleanup utility

All three are useful, but they compete for attention and create too many surfaces for the same job.

The main product opportunity is to simplify around the three core loops above.

---

## Core Features

These are the features that most directly support the product's main value and should remain central.

### Capture — Core

- **Add Item flow**
  - URL ingest
  - search-based ingest
  - manual add
- **Metadata fetching**
  - books
  - movies
  - TV
  - podcasts
  - YouTube
  - articles
  - tweets
- **Import system**
  - CSV
  - major third-party library imports
- **Duplicate detection during import / create**
- **Metadata persistence**
- **Background metadata resync**

### Decide — Core

- **Dashboard**
  - main product overview
- **Next To Consume**
  - recommendation engine based on stored scores
- **Recommendation controls**
  - hide
  - boost
  - cooldown
  - trending toggle
- **Reminder resurfacing**
- **Saved views / smart views**
- **Lists / custom collections**
- **Per-type browsing pages**
  - books
  - movies
  - TV
  - podcasts
  - videos
  - articles
  - tweets

### Consume — Core

- **Full item detail page**
  - primary item workspace
- **Progress tracking**
  - books
  - articles
  - podcasts
  - videos
  - movies
  - TV
- **TV season tracking**
- **In Progress dashboard surface**
- **Structured notes**
  - highlights
  - quotes
  - takeaways
  - reflections
- **Private notes**
- **Tags on items**

---

## Advanced Features

These are valuable, but they are not essential to the product's first-read clarity. They should likely stay, but be positioned as secondary or tucked behind more deliberate entry points.

### Advanced Product Operations

- **Import job history**
- **Duplicate merge review**
- **AI job queue monitoring**
- **Manual metadata-oriented repair flows**

### Advanced Recommendation Tuning

- **Interest profiles per content type**
- **Freeform taste profile**
- **Manual scoring refresh**
- **Detailed score explanation panels**

### Advanced Organization

- **Deep saved-view filtering**
  - min score
  - max duration
  - trending-only
  - query
- **Ordered custom lists**
- **Cross-list curation workflows**

### Advanced Reflection

- **AI analysis per item**
- **Tag suggestions from AI**
- **Topic suggestions from AI**

### Advanced Configuration

- **Per-user API key management**
- **AI model testing**
- **Queue interval tuning**

---

## Candidate Features for Removal or Heavy Simplification

These are the features or surfaces that currently create the most cognitive drag, duplication, or maintenance cost.

### 1. Duplicate Recommendation Surfaces

Current state:

- dashboard has a strong `Next To Consume` section
- topbar also opens a separate `Next To Consume` modal

Why this is a problem:

- duplicates one of the most important workflows
- splits user attention
- creates two ways to reach the same conceptual result

Recommendation:

- keep one primary recommendation surface
- likely keep the dashboard version as primary
- convert the topbar action into navigation rather than a separate modal

Classification:

- **Candidate for Simplification / Removal**

### 2. Duplicate Item Detail Surfaces

Current state:

- full item detail page at `/item/$id`
- global right-side detail sheet opened from search

Why this is a problem:

- duplicated feature surface
- duplicated maintenance burden
- user has two mental models for “open an item”

Recommendation:

- make the full item page the primary editing surface
- either remove the sheet or reduce it to a lightweight preview

Classification:

- **Candidate for Simplification / Removal**

### 3. Settings as an Operational Control Center

Current state:

Settings currently contains:

- profile
- API keys
- AI model
- interests
- reminders
- duplicates
- tags
- data tools
- queue tasks

Why this is a problem:

- mixes preferences with active workflows
- makes Settings feel heavy and intimidating
- hides important action-oriented features in the wrong place

Recommendation:

- keep true settings in Settings
- move reminders, duplicates, and queue tasks into an inbox/review workflow

Classification:

- **Candidate for Simplification**

### 4. Raw AI Prompt Template Editing

Current state:

- users can directly edit analysis and scoring prompt templates

Why this is a problem:

- highly technical
- useful mostly for development, experimentation, or internal operations
- raises complexity for normal users

Recommendation:

- hide behind an `Advanced` section
- or remove from main product UI entirely

Classification:

- **Candidate for Removal from default UI**

### 5. Raw Model Selection for General Users

Current state:

- users can choose and test backend AI models

Why this is a problem:

- most users do not want model-level decisions
- adds setup friction
- reads more like internal tooling than product value

Recommendation:

- keep one recommended default
- move model controls into advanced settings

Classification:

- **Candidate for Simplification**

### 6. Legacy Board / Grid Systems

Current state:

The codebase still contains legacy surfaces such as:

- `BoardView`
- `GridView`
- older `ItemCard` workflow

Why this is a problem:

- may represent dead product direction
- adds code maintenance cost
- creates confusion about what the real product shape is

Recommendation:

- audit whether these are still intentionally used
- if not, remove them

Classification:

- **Candidate for Removal**

---

## Current Surface Audit

### App Shell

| Surface | Loop | Classification | Notes |
|---|---|---|---|
| Sidebar navigation | Decide | Core | Main structure for library browsing |
| Topbar search trigger | Decide | Core | Useful entry point, but search should become more actionable over time |
| Topbar Add button | Capture | Core | Key product action |
| Topbar Next button | Decide | Candidate for Simplification | Duplicates dashboard recommendation surface |

### Dashboard

| Surface | Loop | Classification | Notes |
|---|---|---|---|
| Dashboard home | Decide | Core | Good primary overview |
| Next To Consume section | Decide | Core | Strong candidate for primary recommendation surface |
| In Progress section | Consume | Core | Important resume surface |
| Reminder Inbox widget | Decide | Core | Valuable, but should likely lead into broader inbox flow later |
| Recently Added | Capture | Core | Useful feedback on saved items |
| Smart Views shelf | Decide | Advanced | Useful but secondary to core flow |
| Library Snapshot / stats | Decide | Advanced | Informative, not action-driving |

### Item-Level Surfaces

| Surface | Loop | Classification | Notes |
|---|---|---|---|
| Full item detail page | Consume | Core | Should be the main item workspace |
| Global item detail sheet | Consume | Candidate for Simplification | Overlaps heavily with full detail page |
| Progress editing | Consume | Core | Essential |
| TV season tracking | Consume | Core | Strong type-specific behavior |
| Structured notes | Consume | Core | Strong product depth |
| AI analysis panel | Decide / Consume | Advanced | Useful, but not a top-level primary action |

### Collection / Library Surfaces

| Surface | Loop | Classification | Notes |
|---|---|---|---|
| Per-type pages | Decide | Core | Good browsing structure |
| Lists page | Decide | Core | Valuable planning and curation feature |
| Saved view filters | Decide | Advanced | Powerful, but not first-order product value |
| Bulk selection / delete | Decide | Advanced | Useful for cleanup, especially after imports |

### Capture Surfaces

| Surface | Loop | Classification | Notes |
|---|---|---|---|
| Add Item dialog | Capture | Core | Central, but currently overloaded |
| Search-based ingest | Capture | Core | Important |
| URL-based ingest | Capture | Core | Important |
| Manual add | Capture | Core | Needed fallback |
| Import workflows | Capture | Core | High value for migration and scale |
| Import jobs history inside add flow | Capture | Advanced | Useful, but secondary |
| Manual field mapping | Capture | Advanced | Necessary for edge cases, not core day-to-day use |

### Settings

| Surface | Loop | Classification | Notes |
|---|---|---|---|
| Profile | Decide | Core | Simple, appropriate |
| API keys | Capture / platform config | Advanced | Useful for power users |
| Interest profiles | Decide | Advanced | Valuable but potentially overlapping with taste profile |
| Taste profile | Decide | Advanced | Valuable but potentially overlapping with interest profiles |
| AI model controls | platform config | Candidate for Simplification | Too technical for most users |
| AI prompt templates | platform config | Candidate for Removal from default UI | Strongly developer-oriented |
| Reminders tab | Decide | Candidate for Relocation | Better as inbox/review workflow |
| Duplicates tab | Capture / cleanup | Candidate for Relocation | Better as review workflow |
| Queue tasks tab | platform ops | Candidate for Relocation | Better as operational review workflow |
| Tags tab | Consume / organize | Advanced | Useful, but secondary to item-level tagging |

---

## Biggest Product Gaps

These are not the same as “missing features from the codebase.” These are the biggest missing pieces in the actual product experience.

### 1. No Unified Inbox / Triage Flow

Important action-needing content is scattered across:

- reminders
- duplicates
- imports
- queued / failed background jobs
- suggestions
- stale in-progress items

This is the biggest product gap.

### 2. No Fast Action Layer on Recommendation Results

Recommendations explain what to watch or read next, but acting on them still requires too much navigation.

Missing:

- start now
- not now
- hide
- boost
- add to list

### 3. No Great Quick-Capture Workflow

Capture exists, but the common flow is still heavy.

The Add Item dialog is powerful, but not yet lightweight enough for rapid everyday saving.

### 4. Resume Loop Is Weaker Than It Should Be

In-progress and progress tracking exist, but the app still lacks a strong “continue where I left off” loop.

### 5. Notes Are Deep but Not Broadly Surfaced

Notes and highlights are good inside item detail, but they do not yet form a visible knowledge layer across the product.

---

## V3.4 Recommendations

### Keep Central

- capture flows
- dashboard
- full item detail page
- progress tracking
- TV season tracking
- reminders
- lists
- imports
- recommendation scoring

### Keep but Reposition

- saved views
- AI analysis
- tags management
- interest profiles
- API key management

### Simplify or Hide

- topbar recommendation modal
- global item detail sheet
- AI model selection
- AI prompt templates
- queue task management as a main settings concern

### Relocate Into Future Inbox / Review Flow

- reminders management
- duplicate review
- import cleanup
- failed queue work

### Audit for Removal

- legacy board view
- legacy grid view
- unused legacy item card workflows

---

## Definition of Success for Phase 1

Phase 1 is successful if SirajHub becomes easier to explain in one sentence:

> Save media quickly, decide what matters next, and track your progress without friction.

That means:

- fewer duplicate surfaces
- less technical noise in default UI
- clearer primary workflows
- stronger distinction between core product and advanced controls
