# Next.js + FastAPI overnight handoff

## Scope and commits

- Starting commit: `9175271058291e1c462844d19bb0bc2f22c7cd92`
- Ending implementation commit: `52f3b7a00ecbae68a393d14bf79ef39995d07133`. The final handoff-only commit follows this SHA and cannot self-reference its own commit ID.
- Implementation sequence: `6ca742c8` — foundation; `a2c04db6` — foundation handoff; `722659f5` — shared UI; `df35e950` — public routes; `39c76532` — typed content; `d2e663ea` — reference lesson; `62de568b` — in-memory application services; `554d9805` — mock-backed account and CV flows; `52f3b7a0` — parity dashboard and final visual evidence; `docs(migration): record overnight implementation results` — this handoff-only commit.
- No push, merge, deployment, database, external service, real account, real credential, real CV, Supabase, or provider API action occurred.

## Workstream status

| Workstream | Status | Evidence |
|---|---|---|
| 1. Foundation | Complete | Isolated `apps/web` and `apps/api`, health/readiness/version endpoints, safe error envelopes, JSON-safe logs, request IDs, proxy, tests, Dockerfiles, and root commands. |
| 2. Shared UI system | Complete | Full primitive inventory, shared responsive shell, fixture account menu, design mapping, unit/browser tests, axe gate, and paired responsive evidence. |
| 3. Public pages | Complete | Ten public route classes, four static certification tracks, legacy compatibility paths, typed source reads, search/filter interactions, metadata, responsive layouts, and paired evidence. |
| 4. Typed content | Complete | Zod runtime boundaries cover phases, lessons, glossary, certifications, assessments/questions, quizzes, provenance, and route metadata. Cached loaders, deterministic query/navigation helpers, static track params, and a 12-entry parity manifest/checker meet the slice criteria. |
| 5. Reference lesson | Complete | The preferred optimization lesson preserves trusted Markdown, metadata, provenance, code/copy controls, five diagram definitions, the exact local interactive figure behavior, quiz content and in-memory scoring, TOC state, source navigation, error states, and legacy URL compatibility. |
| 6. Pure API domain | Complete | Pydantic contracts, repository/service protocols, deterministic in-memory adapters, cross-language progress reconciliation, bounded CV intake, fake provider failure matrix, analysis state machine, safe error mapping, stable pagination, deterministic OpenAPI, generated TypeScript contracts, and drift tests. |
| 7. Mock product routes | Complete | A development-only synthetic learner workspace consumes FastAPI-owned provider, progress, CV, analysis, history, pagination, deletion, and settings state through the local proxy. It covers every fake outcome, accessible status/error states, all result fields, and explicit privacy/persistence boundaries. |
| 8. Evidence suite | Complete | Browser evidence covers every migrated route and important interaction at both required viewports. API and fixture matrices cover all required states. A deterministic dashboard is generated from the 12-entry parity manifest and checked for drift: 11 routes are complete and assessment remains honestly planned. |

Completed workstreams: 1–8. Partial workstreams: none. Unstarted workstreams: none. The assessment route is explicitly planned rather than migrated because assessment migration was outside the overnight reference scope.

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
- Workstream 6 `npm run test:api` — passed: 30 tests covering progress conflicts/idempotence, CV types and bounds, repository ownership, pagination, deletion, provider/model allowlists, eight fake outcomes, state transitions, canonical result dimensions/signals, safe errors/logs, OpenAPI, and contract drift.
- Workstream 6 `npm run test:web` — passed: 5 files and 23 tests, including the two language-neutral progress fixtures shared with Python.
- Workstream 6 `npm run check:precommit`, `npm run typecheck:migration`, and `npm run build:migration` — passed. The first typecheck caught and prompted correction of an invalid TypeScript comment; the rerun and 21-page production build passed.
- Workstream 7 `npm run test:api` — passed: 32 tests, including the HTTP fixture matrix and reserved invalid-credential path.
- Workstream 7 `npm run test:web` — passed: 5 files and 23 tests.
- Workstream 7 `npm run test:web:e2e` — passed: 48 Chromium checks, including five account/CV-flow tests, every provider failure, axe, keyboard-accessible controls, history pagination, delete cancellation/confirmation, privacy assertions, responsive overflow, and paired screenshots.
- Workstream 7 `npm run check:precommit`, `npm run typecheck:migration`, and `npm run build:migration` — passed; the production build renders the fixture workspace as disabled.
- Workstream 8 `npm run check:route-parity` — passed: all 12 legacy HTML routes are accounted for, 11 are complete, one is planned, and the generated dashboard matches the manifest.
- Local API (`127.0.0.1:8000`) and web (`127.0.0.1:3000`) startup — passed with elevated local-loopback permission only.
- Local web proxy `GET /api/v1/health` — passed and preserved the supplied request ID.
- `npm run ci` — failed in existing `scripts/test_translate_workflow.py::TranslateWorkflowContractTest.test_commit_failure_never_reports_publish_success`; it returned success where the test expected a commit failure. This was discovered only in final CI and is unrelated to the new application paths. Do not treat CI as passing until reproduced and resolved separately.

### Final validation on `52f3b7a0`

| Command | Exit | Result |
|---|---:|---|
| `npm run check:precommit` | 0 | 503 lessons, 33 certification lessons, 8 assessments, and all Codeology validators passed. |
| `npm run test:migration` | 0 | 32 API tests, 23 Vitest tests, and 48 Chromium tests passed. |
| `npm run typecheck:migration` | 0 | TypeScript and Python compilation passed. |
| `npm run build:migration` | 0 | Next.js production build compiled and generated 21 pages; Python compilation passed. |
| `npm run ci` | 1 | The unrelated translation-workflow contract test above failed before the root build phase. |
| `git diff --check` | 0 | No whitespace errors. |
| `git status --short` | 0 | Before this handoff commit: only browser-regenerated evidence PNGs plus the three user-owned untracked specification files were present. After this commit, the expected remaining entries are only those three untouched specification files. |

## Dependencies and architecture

`apps/web/package.json` pins Next.js 16.3.2, React, Tailwind, TypeScript, Vitest, Playwright, axe, component-test support, and Zod 4.1.12. Zod is the sole Workstream 4 addition and validates repository content before it enters render or assessment contracts; installation used `--no-package-lock`, reported zero vulnerabilities, and remained isolated from lesson code. The initial Next.js 15 and Vitest 3.2.4 pins were upgraded after the temporary-lockfile audit identified current high/critical advisories; a repeated install audit reported zero vulnerabilities. Workstream 5 adds no dependency: a trusted-source Markdown parser stays within the TypeScript allowlist, the fixed local compatibility endpoint serves the exact checked-in figure script, and deterministic local Mermaid composition retains complete source fallback without external traffic. Production builds explicitly use Next's webpack path because the managed environment denies Turbopack's internal CSS-worker port. `apps/api/pyproject.toml` pins FastAPI, Pydantic, Pydantic Settings, and Uvicorn. All are isolated from lesson directories.

The API intentionally has no persistence or external adapters. Pure services depend on protocols and deterministic ownership-scoped memory adapters; fake providers are compiled allowlists and cannot perform I/O. The OpenAPI snapshot generates a hash-bound TypeScript artifact consumed by the web boundary, and drift tests fail if either artifact changes unexpectedly. Its proxy forwards only allowlisted safe headers. Logs allowlist operational fields and tests prove CV content, prompts, provider responses, credentials, authorization values, and cookies are not emitted. Workstream 7 adds no dependency and no frontend data repository: the client retains only view/form state and calls the FastAPI-owned fixture state.

## Parity, accessibility, and security

All required public route classes and the single reference lesson are migrated. Paired files and route-by-route classifications are in `visual/WORKSTREAM_3.md`, `visual/WORKSTREAM_5.md`, and `visual/WORKSTREAM_7.md`; the component mapping remains in `DESIGN_MAPPING.md`. The latest 48-test run has no serious or critical axe findings, browser console errors, broken keyboard controls, exposed fixture inputs, or Next.js horizontal overflow. The lesson compatibility wrapper corrects inaccessible legacy slider labels while retaining the figure behavior.

Editorial HTML and lesson Markdown are trusted checked-in repository content, never user input. The lesson loader is allowlisted to one fixed source and the compatibility script route cannot select an arbitrary filesystem path. CV Analysis accepts only synthetic fixtures in memory and never calls a provider. It is marked as local/non-production in development and disabled in the production build; file extraction remains an explicit fake boundary. All browser evidence blocks non-loopback traffic and checks concrete fixture secrets plus the synthetic CV body are absent. Real authentication, persistence, file extraction, secret/object storage, and provider adapters remain unimplemented.

## Evidence index and known nondeterminism

- Route status and required tests: `MIGRATION_DASHBOARD.md`.
- Foundation and design decisions: `STARTING_STATE.md`, `DESIGN_MAPPING.md`.
- API contract evidence: `WORKSTREAM_6.md`.
- Final quality matrix: `WORKSTREAM_8.md`.
- Paired screenshots and classifications: `visual/WORKSTREAM_2.md`, `visual/WORKSTREAM_3.md`, `visual/WORKSTREAM_5.md`, and `visual/WORKSTREAM_7.md`.

No test was observed to be flaky. Repeated Chromium captures can produce byte-level PNG differences from browser/legacy rasterization even when the visible layout and assertions are stable. The committed images are from the final passing migration run; acceptance relies on paired visual inspection plus deterministic overflow, accessibility, console, content, and interaction assertions rather than PNG byte identity.

## Unresolved items

- Root CI must be green before integration; its translation-workflow failure is not caused by files in this experiment and was intentionally not repaired across scope boundaries.
- `/assessment.html` remains mapped to the planned `/assessments/[assessment]` route. Migrating it requires a separately authorized product slice, not an expansion of the single-reference-lesson overnight experiment.
- Production authentication, persistence, provider calls, file extraction, and deployment remain explicitly excluded; no architecture choice for those boundaries was made here.

## Reviewer checklist

1. Run `npm run test:migration`, `npm run typecheck:migration`, and `npm run build:migration`.
2. Start `npm run dev:api` and `npm run dev:web`; request `GET /api/v1/health` through the web origin.
3. Inspect `apps/api/app/main.py`, `apps/api/app/application.py`, `apps/api/openapi.json`, and `apps/web/app/api/v1/[...path]/route.ts` before extending any trust boundary.
4. Reproduce and resolve the unrelated root-CI translation test before integration.
5. Inspect `MIGRATION_DASHBOARD.md`, `WORKSTREAM_8.md`, and the owning visual evidence files, especially the intentional roadmap, local Mermaid, and fixture-product boundaries.

## Recommended next action

Review the highest-risk API/proxy/privacy boundaries and paired visual evidence, then resolve the unrelated root-CI translation failure before considering selective integration. Assessment migration remains a separately scoped follow-up.

---

## Academy parity and accessibility continuation — 2026-08-23

This continuation supersedes the earlier Academy accessibility and
nondeterminism notes where they conflict.

### Scope and commit

- Continuation base: `9158783491cca2482a17e8a127f926c9fa65635b`.
- Ending commit: `fix(web): restore Academy parity and accessibility`; this
  handoff is part of that commit and cannot self-reference its final SHA.
- Workstreams 1–8 remain complete. This continuation finishes the Academy
  vertical slice within Workstreams 3 and 8; no workstream is partial or newly
  unstarted.
- The existing Next Catalog design was explicitly preserved and not changed.
- No push, merge, deployment, database, Supabase, provider, account, secret,
  CV, or other external-service action occurred.

### Implemented correction

- The Next Academy now renders the maintained `site/index.html` content and
  stylesheet stack through a client behavior adapter, preserving source
  attribution, curriculum totals, local progress, phase dialog behavior,
  responsive layout, typography, animation, and URLs.
- Investigation proved the `.reveal` contrast report was Axe sampling the
  finite hero title/entrance animation. The test now awaits finite Web
  Animations promises; it does not disable, shorten, restyle, or exclude the
  animation.
- Both maintained legacy and Next Academy surfaces give the two book-note links
  persistent 1px underlines with `0.2em` offset.
- The certification disclaimer receives a 2% ink mix, moving the observed
  light-theme ratio from 4.42:1 above 4.5:1 with no layout change.
- The legacy phase overlay is inert while closed, matching Next and preventing
  hidden controls from receiving focus. Required imported-source adaptation
  records cover both changed legacy files.
- No Axe rule, node, route, or region is excluded. Normal and reduced motion
  both produce zero serious or critical findings in Chromium and WebKit.

### Evidence and difference classification

- Report: `docs/migration-evidence/visual-parity/reports/academy.md`.
- Immutable canonical references remain under
  `docs/migration-evidence/visual-parity/reference-production/` and were not
  modified.
- Preserved pre-correction candidates remain under
  `docs/migration-evidence/visual-parity/candidate-next/`.
- Same-run paired before projections, corrected captures, JSON sidecars, and
  diffs are separately labelled under
  `accessibility-pre-correction-projection/`, `accessibility-corrected/`, and
  `accessibility-corrected-diffs/`.
- The corrected evidence covers both browsers, four viewports, two themes, and
  viewport/full-page captures: 32 paired screenshots and 32 diff images.
- The matrix contains 3,148 changed pixels, all in the full-page book-link
  rectangles; every sidecar reports `outsideApprovedRegions: 0`. All 16
  initial viewport captures are exact. The two-step disclaimer correction
  clears Axe but rounds to identical antialiased screenshot pixels. Inert state
  and test synchronization are non-visual.

### Continuation validation record

| Command | Exit | Result |
|---|---:|---|
| Focused legacy/Next normal and reduced-motion Axe matrix | 0 | 4/4 passed in Chromium and WebKit with zero serious/critical findings. |
| Accessibility-corrected visual matrix | 0 | 16/16 cases passed; 32 paired captures, zero changed pixels outside approved regions. |
| `npm run check:precommit` | 0 | All provenance, product, accessibility, lesson, and certification gates passed after adding the required `site/app.js` sidecar. |
| First `npm run test:migration` | 1 | 107/108 browser cases passed; one unrelated Chromium lesson-fallback lookup timed out. The isolated rerun passed 1/1. |
| Final `npm run test:migration` | 0 | 32 API tests, 23 Vitest tests, and 108 Chromium/WebKit E2E tests passed. |
| `npm run typecheck:migration` | 0 | Standalone rerun passed. An earlier parallel run raced with `build:migration` recreating `.next/types`; no source error was involved. |
| `npm run build:migration` | 0 | Next production build compiled and generated 21 routes; Python compilation passed. |
| `npm run ci` | 1 | The pre-existing translation-workflow contract still reports success where its commit-failure fixture expects failure. This remains outside the migration slice and prevents claiming root CI is green. |
| `git diff --check` | 0 | No whitespace errors before final staging. |

The single lesson-fallback timeout was observed once in the first complete run,
then passed in an isolated rerun and in the final 108-case run. No retry setting
was added and no lesson behavior was changed.

### Dependency and architecture note

`sharp` `0.35.3` is now a pinned direct development dependency for exact RGBA
pixel-boundary classification. The same version was already installed by
Next.js, so no package installation or lockfile was created. The test rejects
any changed pixel outside the approved DOM rectangles rather than using a
percentage tolerance or mask. No runtime dependency or application trust
boundary changed.

### Remaining review gates

- Root CI's unrelated translation-workflow failure must be resolved before
  integration.
- Mobile-menu, deterministic initial-animation, primary-hover, and
  primary-focus visual states still need their specified evidence captures.
- A human reviewer must inspect the corrected paired evidence before marking
  Academy `visual-verified` or `reviewed`.

Reviewer priority: inspect the Academy report and a desktop/mobile full-page
corrected sidecar first, run the final migration command, then verify the
canonical reference tree has no diff and the Catalog page remains unchanged.

---

## Editorial parity continuation — 2026-08-23

### Scope and status

- About, Credits, and Assurance now render the maintained legacy source and
  stylesheet stack with route-correct structure and footers.
- All three routes are `visual-verified`; none is `reviewed` because independent
  human inspection is still required.
- The current Next Catalog design was explicitly preserved. No Catalog
  implementation or style was changed to match the legacy page.
- No push, merge, deployment, account, database, Supabase, provider, secret,
  real CV, or other external-state action occurred.

### Accessibility and interaction corrections

- Assurance exposed real static light-theme contrast failures in Chromium and
  WebKit: 2.86:1 for its large hero and 4.45:1 for verified-state labels.
- The maintained stylesheet now uses route-scoped colors measuring 3.19:1 and
  4.66:1 respectively. Dark theme and all non-Assurance colors are unchanged.
- Shared legacy and Next skip links now move keyboard focus to the main region
  instead of changing only the URL fragment.
- No Axe exclusion or parity exception was added. Legacy and Next pass normal
  and reduced motion with zero serious/critical findings in both engines.

### Evidence and validation

- Report: `docs/migration-evidence/visual-parity/reports/editorial.md`.
- Canonical production references contain 96 images plus 96 sidecars across
  both engines, four viewports, two themes, three routes, and two capture sizes.
- The invalid first editorial capture is preserved separately as
  `reference-production-unsynchronized-editorial`; the settled capture helper
  prevents recurrence. Academy references were not overwritten.
- Assurance has 32 corrected captures, pre-correction projections, diffs, and
  sidecars. The 312,316 light-theme changed pixels are all inside the approved
  hero/verified-label rectangles; every sidecar reports zero outside pixels.
- Full visual matrix: 64/64 passed across Chromium and WebKit, including the
  approved Academy and editorial accessibility corrections.
- Focused legacy/Next accessibility and focus matrix: 6/6 passed.
- Editorial landmark/Axe and responsive matrix: 24/24 passed.
- Final `npm run test:migration`: 32 API tests, 24 Vitest tests, and 114
  Chromium/WebKit end-to-end tests passed.
- Final `npm run typecheck:migration` and `npm run build:migration` passed; the
  production build generated 21 routes and Python compilation passed.
- `npm run check:precommit` passed all validators for 503 lessons, 33
  certification lessons, and 8 assessments.
- Root `npm run ci` stopped only at the known, unrelated
  `TranslateWorkflowContractTest.test_commit_failure_never_reports_publish_success`
  failure (expected nonzero, observed zero). No out-of-scope correction was
  attempted.

### Remaining gates

- Human review is required before About, Credits, or Assurance becomes
  `reviewed`.
- Other route families remain unreviewed and the overall visual-parity goal is
  still active.
- Catalog legacy restyling is excluded by explicit user direction; preserve its
  current Next appearance while continuing functional/accessibility checks.

---

## Glossary parity continuation — 2026-08-23

### Scope and status

- Glossary is now `visual-verified`; independent human review is still required.
- The Next route preserves the maintained 243-entry ledger, source/category
  order, search scoring, filters, URL state, keyboard shortcuts, letter and
  deep-anchor navigation, evidence disclosures, lesson/source links, related
  links, copy feedback, themes, responsive behavior, attribution, and footer.
- The current Next Catalog design was explicitly preserved. No Catalog source,
  style, status, or reference capture was changed.
- No push, merge, deployment, account, provider, database, secret, CV, or other
  external-state action occurred.

### Accessibility and synchronization

- Focused/open Glossary evidence exposed real light-theme contrast failures:
  4.41:1 accent text, 4.13:1 muted labels, and 3.94:1 hover text. These were not
  animation or intersection timing failures.
- The maintained legacy source now uses `#b93600` for affected evidence and
  related links and `#666` for evidence labels. Next consumes the same source
  style, so the implementations do not diverge; dark mode is unchanged.
- No Axe exclusion or WCAG/parity exception was added. Legacy and Next pass in
  Chromium and WebKit under normal and reduced motion with zero serious or
  critical findings.
- Initial hash and smooth-scroll races produced two invalid capture sets. Both
  are preserved under the separately labelled unsynchronized Glossary trees.
  The canonical production tree was not overwritten. A separately named
  `deep-anchor-synchronized` set deterministically sets the hash and aligns the
  target after hydration.

### Evidence and validation

- Report: `docs/migration-evidence/visual-parity/reports/glossary.md`.
- The production Glossary tree contains 128 immutable images and sidecars,
  including 16 separately named synchronized deep-anchor references.
- The accessibility matrix has 16 corrected focused-entry captures, 16
  same-run projections, 16 diffs, and 16 sidecars. Light mode changes 29,820
  antialiased text pixels; dark mode is exact; every sidecar reports zero pixels
  outside approved regions.
- Focused legacy/Next interaction, keyboard, responsive, console/network, Axe,
  and normal/reduced-motion matrix: 2/2 browser projects passed.
- Accessibility-corrected screenshot matrix: 16/16 passed.
- Latest combined visual batch: 71/72 passed immediately. The sole Chromium
  desktop empty-result mismatch comprised 41 isolated antialias-edge pixels;
  the unchanged state passed 1/1 on immediate isolation. Canonical references
  were not updated.
- Unit suite: 24/24 passed. Typecheck, production build, route-parity, and diff
  checks passed.
- Full migration suite: 32 API tests, 24 unit tests, and 115/116 browser cases
  passed; the unrelated Chromium lesson-fallback timeout passed 1/1 on
  immediate isolation.
- Root `npm run ci` again stopped only at the pre-existing
  `test_commit_failure_never_reports_publish_success` translation-workflow
  contract failure, after all preceding validation passed.
- Chromium does not reliably tile sticky content in Glossary full-page images
  taller than 100,000 pixels. Those desktop/wide full-page comparisons are
  skipped by a measured canvas-height guard; exact viewports, Chromium
  mobile/tablet full pages, all WebKit full pages, and shorter filtered
  desktop/wide full pages remain mandatory. No tolerance or mask was added.

### Remaining gates

- A human reviewer must inspect the Glossary paired evidence before its status
  becomes `reviewed`.
- Other unreviewed route families remain active migration work.
- Catalog legacy restyling remains excluded by explicit user preference.

---

## Skill Map parity continuation — 2026-08-23

### Scope and status

- Skill Map is now `visual-verified`; independent human review remains required.
- The Next route consumes the maintained `site/prereqs.html`, roadmap stylesheet,
  graph data, and runtime through an isolated adapter, preserving all 20 phases,
  graph navigation, zoom, pan, selection, history, phase finder, responsive
  layout, themes, focus, URLs, attribution, and the route-specific footer.
- The current Next Catalog design was explicitly preserved. No Catalog
  implementation, stylesheet, route state, or visual reference was changed.
- No push, merge, deployment, account, provider, database, secret, CV, or other
  external-state action occurred.

### Accessibility and synchronization

- Axe was rerun only after fonts, graph construction, and motion state settled.
  The failures remained, proving they were static contrast issues rather than
  reveal/intersection timing defects.
- The maintained shared stylesheet minimally darkens the light-theme legend and
  graph hint from `#707070` (4.15:1) to `#696969` (4.60:1), and the recommendation
  label from `#c43b00` (4.42:1) to `#c23a00` (4.51:1). Dark mode is unchanged.
- No Axe exclusion or WCAG/parity exception was added. Legacy and Next pass in
  Chromium and WebKit under normal and reduced motion with zero serious or
  critical findings.
- Smooth-scroll timing audits are retained separately. Active captures wait for
  fonts and stable layout and align flow anchors deterministically without
  changing application motion.

### Evidence and validation

- Report: `docs/migration-evidence/visual-parity/reports/roadmap.md`.
- The production tree preserves 412 images and sidecars, including timing-audit
  captures; 112 active references cover seven states, two capture sizes, four
  viewports, and both browser engines. Canonical captures were not overwritten.
- The corrected-only matrix has 64 corrected captures, 64 same-run projections,
  64 diffs, and 64 sidecars. All 35,464 changed text pixels are inside approved
  legend, hint, or recommendation-label rectangles; outside count is zero.
- Complete Skill Map visual matrix: 72/72 passed. Focused interaction,
  keyboard, history, pan, zoom, responsive, console/network, Axe, and
  normal/reduced-motion checks: 8/8 passed across Chromium and WebKit.
- Catalog freeze regression: 8/8 passed for landmarks, Axe, keyboard search,
  and mobile/desktop overflow, without changing Catalog.
- Full migration validation passed 32/32 API tests and 25/25 unit tests. The
  browser run passed 117/118; its only unrelated WebKit lesson-fallback timeout
  passed 1/1 on immediate isolation. Every Skill Map and Catalog case passed.
- Typecheck, the 21-route production build, route-parity validation, and the
  complete pre-commit gate passed. Root `npm run ci` again stopped only at the
  pre-existing translation-workflow commit-failure contract (expected nonzero,
  observed zero), after all preceding checks passed.

### Remaining gates

- A human reviewer must inspect the Skill Map paired evidence before its status
  becomes `reviewed`.
- Other unreviewed route families remain active migration work.
- Catalog legacy restyling remains excluded by explicit user preference.

---

## Certifications parity continuation — 2026-08-23

### Scope and status

- The certification programme index and track route are now
  `visual-verified`; independent human review remains required.
- Next consumes the maintained certification HTML, CSS, data, and progress
  runtime through isolated adapters, preserving four tracks, nine selected
  track lessons, two assessments, optional deep dives, progress, clean URLs,
  themes, responsive behavior, attribution, and disclaimer text.
- The main `/catalog` route was not changed. Its current Next design remains
  frozen by explicit user direction.
- No push, merge, deployment, account, provider, database, secret, CV, or other
  external-state action occurred.

### Accessibility and synchronization

- Axe was rerun after fonts, certification data, and motion had settled. The
  optional-extension badge/link remained at approximately 3.70:1, proving a
  real static contrast failure rather than reveal/intersection test timing.
- The shared maintained stylesheet minimally changes only those light-theme
  roles from `#c43b00` to `#a73b00` (4.51:1). Dark mode is unchanged and Next
  consumes the same source; no exception or Axe exclusion was introduced.
- The first immutable programme-index references remain preserved. Because a
  remote lazy credential badge produced cache-dependent initial states, the
  active `certifications-synchronized-v2` evidence uses a transparent in-memory
  image in the capture harness only. Normal application badge loading remains
  unchanged.

### Evidence and validation

- Report: `docs/migration-evidence/visual-parity/reports/certifications.md`.
- The active matrix passes 40/40 comparisons across Chromium and WebKit, four
  viewports, programme-index light/dark, track light/dark, and deterministic
  2-of-9 progress state.
- Separately labelled corrected evidence passes 8/8 projects and confines every
  changed pixel to the approved badge or book-note link element. Canonical
  production screenshots were not overwritten.
- Focused legacy/Next interaction, keyboard, responsive, progress, normal and
  reduced motion, and Axe checks pass in both engines with zero serious or
  critical findings.
- Certification content tests passed 12/12. The focused certification and
  frozen-Catalog browser gate passed 4/4 across Chromium and WebKit. The
  complete migration run passed 32/32 API tests and 26/26 unit tests; browser
  tests passed 119/120, with every certification and Catalog case green. Its
  sole unrelated WebKit Skill Map speculative-prefetch console error passed
  1/1 on immediate isolation.
- Typecheck, the 21-route production build, route-parity validation, diff
  checks, and the complete pre-commit gate passed.
- Root `npm run ci` again stopped only at the pre-existing translation-workflow
  commit-failure contract (expected nonzero, observed zero), after all preceding
  checks passed. No out-of-scope correction was attempted.

### Remaining gates

- A human reviewer must inspect certification paired evidence before either
  route becomes `reviewed`.
- Certification lesson and assessment destinations retain their own route-family
  acceptance work.
- Catalog legacy restyling remains excluded by explicit user preference.
