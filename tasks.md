# Tasks

## Follow-up engineering after v4.04

- [ ] Move AI processing into a dedicated queue consumer with leases, execution deadlines, stale-job recovery, and idempotency keys.
- [ ] Add pagination and database-backed search; measure query counts and latency with realistic library and import sizes.
- [ ] Apply runtime validation schemas to API routes and import rows, with field-specific errors.
- [ ] Add browser regression coverage for account switching, imports, dialogs, and list operations, plus remote metadata fixtures.
- [ ] Add deployment-level protection against public domains resolving to private network addresses.
- [ ] Review encryption of stored provider keys, distributed abuse limits, account recovery, and password work-factor upgrades.

## Proposed features for later planning

- [ ] Add trash and undo with a recovery window for single and bulk item deletion.
- [ ] Add complete, versioned backup and restore for items, tags, lists, notes, views, and preferences, excluding credentials by default.
- [ ] Add browser and mobile quick capture using the existing ingest and duplicate APIs.
- [ ] Add recommendations that fit a selected time budget, media type, and mood.
- [ ] Add weekly consumption summaries, resurfaced highlights, and progress trends.
