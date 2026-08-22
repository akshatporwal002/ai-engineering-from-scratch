# Next.js + FastAPI overnight handoff

## Scope and commits

- Starting commit: `9175271058291e1c462844d19bb0bc2f22c7cd92`
- Implementation sequence: `6ca742c8` — foundation; `a2c04db6` — foundation handoff; `722659f5` — shared UI; `df35e950` — public routes; `39c76532` — typed content; `feat(lesson): add reference nextjs lesson route` — pending Workstream 5 commit.
- No push, merge, deployment, database, external service, account, credential, CV, Supabase, or provider API action occurred.

## Workstream status

| Workstream | Status | Evidence |
|---|---|---|
| 1. Foundation | Complete | Isolated `apps/web` and `apps/api`, health/readiness/version endpoints, safe error envelopes, JSON-safe logs, request IDs, proxy, tests, Dockerfiles, and root commands. |
| 2. Shared UI system | Complete | Full primitive inventory, shared responsive shell, fixture account menu, design mapping, unit/browser tests, axe gate, and paired responsive evidence. |
| 3. Public pages | Complete | Ten public route classes, four static certification tracks, legacy compatibility paths, typed source reads, search/filter interactions, metadata, responsive layouts, and paired evidence. |
| 4. Typed content | Complete | Zod runtime boundaries cover phases, lessons, glossary, certifications, assessments/questions, quizzes, provenance, and route metadata. Cached loaders, deterministic query/navigation helpers, static track params, and a 12-entry parity manifest/checker meet the slice criteria. |
| 5. Reference lesson | Complete | The preferred optimization lesson preserves trusted Markdown, metadata, provenance, code/copy controls, five diagram definitions, the exact local interactive figure behavior, quiz content and in-memory scoring, TOC state, source navigation, error states, and legacy URL compatibility. |
| 6. Pure API domain | Partial | Foundation only; no repositories, progress merge, document, provider, or analysis services. |
| 7. Mock product routes | Unstarted | No account or CV UI was added. |
| 8. Evidence suite | Partial | Playwright, axe, keyboard, responsive, console, redirect, overflow, and paired screenshot coverage includes the shared UI, all Workstream 3 public routes, and the Workstream 5 reference lesson. Domain-service and mock-product evidence awaits later workstreams. |

## Validation record

- `npm run check:precommit` — passed before and after the foundation.
- `npm run test:migration` — passed: five API tests and one web unit test.
- `npm run typecheck:migration` — passed.
- `npm run build:migration` — passed; Next.js production build completed.
- `npm run test:web:e2e` — passed: four Chromium tests covering axe, focus containment/restoration, overflow, mobile targets, and paired screenshots.
- Workstream 3 `npm run test:web` — passed: 3 files and 11 tests, including generated-content totals and public search/filter states.
- Workstream 3 `npm run typecheck:migration` — passed.
- Workstream 3 `npm run test:web:e2e` — passed: 36 Chromium checks across ten routes, two viewports, axe, console cleanliness, interactions, redirects, and overflow.
- Workstream 4 `npm run check:route-parity` — passed: all 12 legacy HTML routes accounted for exactly once; 10 are complete and 2 are explicitly planned.
- Workstream 4 `npm run test:web` — passed: 3 files and 15 tests, including invalid-path diagnostics, source validation, deterministic search/sort/navigation, and provenance.
- Workstream 4 `npm run typecheck:migration` and `npm run build:migration` — passed; all four certification track pages remained statically generated.
- Workstream 5 focused browser acceptance — passed: 7 Chromium checks covering capability parity, axe, console, keyboard operation, fallbacks, redirects, overflow, both viewports, and interaction evidence.
- Workstream 5 full `npm run test:web:e2e` — passed: 43 of 43 Chromium checks across the complete migrated UI.
- Workstream 5 `npm run test:web` — passed: 4 files and 21 tests, including exact lesson mechanisms, precise malformed-content diagnostics, local scoring/reset, and safe diagram/quiz fallbacks.
- Local API (`127.0.0.1:8000`) and web (`127.0.0.1:3000`) startup — passed with elevated local-loopback permission only.
- Local web proxy `GET /api/v1/health` — passed and preserved the supplied request ID.
- `npm run ci` — failed in existing `scripts/test_translate_workflow.py::TranslateWorkflowContractTest.test_commit_failure_never_reports_publish_success`; it returned success where the test expected a commit failure. This was discovered only in final CI and is unrelated to the new application paths. Do not treat CI as passing until reproduced and resolved separately.

## Dependencies and architecture

`apps/web/package.json` pins Next.js 16.3.2, React, Tailwind, TypeScript, Vitest, Playwright, axe, component-test support, and Zod 4.1.12. Zod is the sole Workstream 4 addition and validates repository content before it enters render or assessment contracts; installation used `--no-package-lock`, reported zero vulnerabilities, and remained isolated from lesson code. The initial Next.js 15 and Vitest 3.2.4 pins were upgraded after the temporary-lockfile audit identified current high/critical advisories; a repeated install audit reported zero vulnerabilities. Workstream 5 adds no dependency: a trusted-source Markdown parser stays within the TypeScript allowlist, the fixed local compatibility endpoint serves the exact checked-in figure script, and deterministic local Mermaid composition retains complete source fallback without external traffic. Production builds explicitly use Next's webpack path because the managed environment denies Turbopack's internal CSS-worker port. `apps/api/pyproject.toml` pins FastAPI, Pydantic, Pydantic Settings, and Uvicorn. All are isolated from lesson directories.

The API intentionally has no persistence or external adapters. Its proxy forwards only allowlisted safe headers. Logs allowlist operational fields and tests prove body, authorization, and cookie values are not emitted.

## Parity, accessibility, and security

All required public route classes and the single reference lesson are migrated. Paired files and route-by-route classifications are in `visual/WORKSTREAM_3.md` and `visual/WORKSTREAM_5.md`; the component mapping remains in `DESIGN_MAPPING.md`. The final 43-test run has no serious or critical axe findings, browser console errors, broken keyboard controls, or Next.js horizontal overflow. The lesson compatibility wrapper corrects inaccessible legacy slider labels while retaining the figure behavior.

Editorial HTML and lesson Markdown are trusted checked-in repository content, never user input. The lesson loader is allowlisted to one fixed source and the compatibility script route cannot select an arbitrary filesystem path. CV Analysis is presentation-only: there is no upload form, account flow, persistence, personal data, or provider call. All browser evidence blocks non-loopback traffic. The remaining security scope is still limited to the foundation boundaries; authentication, persistence, document parsing, and provider adapters are unimplemented.

## Reviewer checklist

1. Run `npm run test:migration`, `npm run typecheck:migration`, and `npm run build:migration`.
2. Start `npm run dev:api` and `npm run dev:web`; request `GET /api/v1/health` through the web origin.
3. Inspect `apps/api/app/main.py` and `apps/web/app/api/v1/[...path]/route.ts` before extending any trust boundary.
4. Reproduce and resolve the unrelated root-CI translation test before integration.
5. Inspect `visual/WORKSTREAM_3.md`, `visual/WORKSTREAM_5.md`, and their screenshot pairs, especially the intentional roadmap, CV Analysis, and local Mermaid boundaries.

## Recommended next action

Implement Workstream 6's pure FastAPI application layer with deterministic in-memory repositories, clocks, IDs, storage, and fake provider adapters only.
