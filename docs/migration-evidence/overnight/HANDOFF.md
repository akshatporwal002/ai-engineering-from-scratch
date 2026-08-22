# Next.js + FastAPI overnight handoff

## Scope and commits

- Starting commit: `9175271058291e1c462844d19bb0bc2f22c7cd92`
- Implementation sequence: `6ca742c8` — foundation; `a2c04db6` — foundation handoff; `722659f5` — shared UI; `feat(web): migrate public editorial routes` — pending Workstream 3 commit.
- No push, merge, deployment, database, external service, account, credential, CV, Supabase, or provider API action occurred.

## Workstream status

| Workstream | Status | Evidence |
|---|---|---|
| 1. Foundation | Complete | Isolated `apps/web` and `apps/api`, health/readiness/version endpoints, safe error envelopes, JSON-safe logs, request IDs, proxy, tests, Dockerfiles, and root commands. |
| 2. Shared UI system | Complete | Full primitive inventory, shared responsive shell, fixture account menu, design mapping, unit/browser tests, axe gate, and paired responsive evidence. |
| 3. Public pages | Complete | Ten public route classes, four static certification tracks, legacy compatibility paths, typed source reads, search/filter interactions, metadata, responsive layouts, and paired evidence. |
| 4. Typed content | Partial | Basic TypeScript models and cached loaders exist for generated phases, prerequisites, glossary, source certification JSON, and trusted editorial HTML. Runtime schemas, full assessment/question/provenance models, metadata helpers, and the parity manifest remain. |
| 5. Reference lesson | Unstarted | No lesson was migrated. |
| 6. Pure API domain | Partial | Foundation only; no repositories, progress merge, document, provider, or analysis services. |
| 7. Mock product routes | Unstarted | No account or CV UI was added. |
| 8. Evidence suite | Partial | Playwright, axe, keyboard, responsive, console, redirect, overflow, and paired screenshot coverage now includes the shared UI and all Workstream 3 public routes. Lesson, domain-service, and mock-product evidence awaits later workstreams. |

## Validation record

- `npm run check:precommit` — passed before and after the foundation.
- `npm run test:migration` — passed: five API tests and one web unit test.
- `npm run typecheck:migration` — passed.
- `npm run build:migration` — passed; Next.js production build completed.
- `npm run test:web:e2e` — passed: four Chromium tests covering axe, focus containment/restoration, overflow, mobile targets, and paired screenshots.
- Workstream 3 `npm run test:web` — passed: 3 files and 11 tests, including generated-content totals and public search/filter states.
- Workstream 3 `npm run typecheck:migration` — passed.
- Workstream 3 `npm run test:web:e2e` — passed: 36 Chromium checks across ten routes, two viewports, axe, console cleanliness, interactions, redirects, and overflow.
- Local API (`127.0.0.1:8000`) and web (`127.0.0.1:3000`) startup — passed with elevated local-loopback permission only.
- Local web proxy `GET /api/v1/health` — passed and preserved the supplied request ID.
- `npm run ci` — failed in existing `scripts/test_translate_workflow.py::TranslateWorkflowContractTest.test_commit_failure_never_reports_publish_success`; it returned success where the test expected a commit failure. This was discovered only in final CI and is unrelated to the new application paths. Do not treat CI as passing until reproduced and resolved separately.

## Dependencies and architecture

`apps/web/package.json` pins Next.js 16.3.2, React, Tailwind, TypeScript, Vitest, Playwright, axe, and component-test support. The initial Next.js 15 and Vitest 3.2.4 pins were upgraded after the temporary-lockfile audit identified current high/critical advisories; a repeated install audit reported zero vulnerabilities. Production builds explicitly use Next's webpack path because the managed environment denies Turbopack's internal CSS-worker port. `apps/api/pyproject.toml` pins FastAPI, Pydantic, Pydantic Settings, and Uvicorn. All are isolated from lesson directories.

The API intentionally has no persistence or external adapters. Its proxy forwards only allowlisted safe headers. Logs allowlist operational fields and tests prove body, authorization, and cookie values are not emitted.

## Parity, accessibility, and security

All required public route classes are migrated. Paired files and route-by-route classifications are in `visual/WORKSTREAM_3.md`; the component mapping remains in `DESIGN_MAPPING.md`. The final public-route run has no serious or critical axe findings, browser console errors, or Next.js horizontal overflow. The first run exposed and then blocked one Academy contrast issue and three mobile headline overflows.

Editorial HTML is trusted checked-in repository content, never user input. CV Analysis is presentation-only: there is no upload form, account flow, persistence, personal data, or provider call. All browser evidence blocks non-loopback traffic. The remaining security scope is still limited to the foundation boundaries; authentication, persistence, document parsing, and provider adapters are unimplemented.

## Reviewer checklist

1. Run `npm run test:migration`, `npm run typecheck:migration`, and `npm run build:migration`.
2. Start `npm run dev:api` and `npm run dev:web`; request `GET /api/v1/health` through the web origin.
3. Inspect `apps/api/app/main.py` and `apps/web/app/api/v1/[...path]/route.ts` before extending any trust boundary.
4. Reproduce and resolve the unrelated root-CI translation test before integration.
5. Inspect `visual/WORKSTREAM_3.md` and its screenshot pairs, especially the intentional roadmap and CV Analysis boundaries.

## Recommended next action

Commit the passing public-route slice independently, then implement Workstream 4 runtime validation and the route-parity manifest before starting the reference lesson.
