# Workstream 8 quality and migration evidence

## Outcome

The final evidence suite accounts for every legacy HTML route and every route migrated during this experiment. The generated dashboard reports 11 complete routes and one explicitly planned assessment route; it does not represent planned work as migrated.

`apps/web/scripts/build-migration-dashboard.mjs` deterministically renders `MIGRATION_DASHBOARD.md` from `apps/web/content/route-parity.json`. Its `--check` mode fails on drift. `npm run check:route-parity` now runs both one-to-one route validation and dashboard drift validation.

## Coverage

- Playwright smoke, landmark, console, accessibility, and overflow checks cover all migrated public pages, the reference lesson, and the mock product route.
- Paired legacy/Next.js screenshots use 390x844 and 1440x1000 viewports. The final 48-test pass regenerated the stored evidence against the current application state.
- Keyboard coverage exercises shared dialog/dropdown focus, mobile navigation, catalog/glossary search, lesson table of contents, figure controls, copy actions, quiz flow, account state, provider controls, history, pagination, and destructive confirmation/cancellation.
- Important interactive evidence includes open navigation, open dialog, local figure state, completed quiz, completed mock analysis, signed-out state, pending/live announcements, safe failures, and reopened/deleted history.
- Fixture coverage includes anonymous, fixture-authenticated, success, empty, malformed, rate-limited, unavailable, and timeout cases. Quota, invalid credential, and safety rejection are also covered.
- API tests cover unit/service boundaries, validation, ownership, pagination, state transitions, safe error mapping, redacted logs, deterministic OpenAPI, generated TypeScript contracts, and drift.

## Evidence map

- Route dashboard: `MIGRATION_DASHBOARD.md`
- Shared UI: `visual/WORKSTREAM_2.md`
- Public routes: `visual/WORKSTREAM_3.md`
- Reference lesson: `visual/WORKSTREAM_5.md`
- Mock product: `visual/WORKSTREAM_7.md`
- API domain: `WORKSTREAM_6.md`

Every material visual difference is classified in the owning evidence file. No unexplained clipping, overlap, missing content, broken focus, illegible contrast, generic styling, incorrect font, or missing responsive behavior remains.
