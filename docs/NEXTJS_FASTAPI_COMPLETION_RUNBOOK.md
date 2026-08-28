# Next.js + FastAPI completion runbook

**Status:** Implementation source of truth for completing the migration  
**Branch:** `akshat/next-fastapi-overnight`  
**Baseline:** Latest `origin/dev` plus the reviewed migration commits already on this branch  
**Target:** A reviewable, functionally complete Next.js + Tailwind frontend and FastAPI application that can replace the legacy deployment without losing user-facing behavior or account data

## 1. Objective

Complete the Next.js and FastAPI migration far enough that normal Codeology development can continue on the new application.

The result must preserve the current academy, lessons, assessments, account behavior, progress, provider selection, and CV Analysis functionality. The existing Supabase PostgreSQL database, Auth, Storage, Row Level Security, and Vault remain managed infrastructure. “FastAPI backend” means that trusted application operations are exposed through FastAPI services and adapters; it does not mean replacing PostgreSQL or copying user data into a new database.

This document supersedes the intentionally limited “one lesson plus mock services” scope in `NEXTJS_FASTAPI_OVERNIGHT_RUNBOOK.md`. Use these documents for supporting detail:

- `AGENTS.md` for repository rules.
- `docs/NEXTJS_FASTAPI_MIGRATION_PLAN.md` for architecture and preservation contracts.
- `docs/NEXTJS_VISUAL_PARITY_SPEC.md` for comparison methodology.
- `docs/migration-evidence/overnight/HANDOFF.md` for the actual implementation state and known gaps.
- `docs/CODEOLOGY_PRODUCT_AND_IMPLEMENTATION_PLAN.md` for product intent.

## 2. Working policy

### 2.1 Required behavior

- Work only on `akshat/next-fastapi-overnight` unless the user explicitly provides another feature branch.
- Preserve and understand the current dirty worktree before editing. Do not discard, overwrite, reset, or recreate the existing uncommitted reference-lesson work.
- Commit independently reviewable milestones with Conventional Commit subjects.
- Do not push, merge, deploy, modify live infrastructure, or use production credentials without explicit user authorization.
- Never commit secrets, real CV files, browser recordings containing private data, `.env` files, `.playwright-mcp/`, generated caches, or `package-lock.json`.
- Do not modify generated `site/data.js`. Keep `phases/`, `certifications/`, `glossary/`, `site/`, and the existing curriculum generation scripts authoritative during the transition.
- Do not weaken, skip, delete, broadly mask, or reduce tests merely to obtain a passing result.
- Preserve attribution, canonical content paths, existing user data, authorization boundaries, accessibility, and responsive behavior.

### 2.2 Persistence instruction

Continue through the workstreams without pausing for routine confirmation, intermediate status approval, minor implementation choices, or non-material visual differences. Make reasonable, documented choices that preserve existing behavior.

Do not declare completion because time has elapsed, a partial implementation works, mocks pass, or the branch builds locally. Continue until the Definition of Done in section 7 is met.

The only valid reasons to stop before completion are:

1. A required external credential, infrastructure permission, paid service, or destructive production operation needs user authorization.
2. The same independently verified blocker remains after at least three materially different, safe attempts and no further local progress is possible.
3. Existing user changes conflict directly with required edits and resolving the conflict would risk losing their work.
4. Two authoritative product or security requirements genuinely conflict and either choice would materially alter behavior or user data.

When one of these occurs, preserve all passing work, record exact reproduction steps and evidence, continue every independent workstream that is not blocked, and ask only the smallest necessary question. A failed test, flaky browser run, difficult visual comparison, or unfamiliar code is not by itself a stopping condition.

## 3. Current state that must not be mistaken for completion

The branch already contains useful foundations:

- Next.js App Router, TypeScript, Tailwind, reusable UI primitives, public routes, and shared-shell work.
- FastAPI health endpoints, error contracts, request IDs, service/repository protocols, OpenAPI generation, and extensive unit tests.
- Typed content boundaries, route-parity tooling, browser tests, and visual evidence.
- A single reference lesson and synthetic account/CV workflows.

The following are still incomplete and are required by this runbook:

- The lesson route is effectively allowlisted to one reference lesson rather than the complete curriculum.
- Most catalogue lesson links still open GitHub instead of internal lesson pages.
- Assessment migration remains planned.
- CV Analysis, progress, provider connections, and account settings use fixtures or in-memory repositories in the new stack.
- Production authentication, Supabase repositories, Storage/Vault operations, document extraction, and real AI-provider adapters are absent.
- The root Vercel configuration still builds the legacy `site/` output.
- The FastAPI deployment target and production web-to-API routing are not configured.
- Root CI has had an unresolved translation-workflow failure.
- The current reference-lesson parity changes are uncommitted and have an unresolved cumulative vertical-layout difference.

## 4. Ordered implementation plan

Work in the following order. Each workstream should leave the branch in a testable state and receive its own logical commit or small series of commits.

### Workstream 0 — Protect and reconcile the branch

1. Record the current branch, `HEAD`, `origin/dev`, status, and relevant tool versions.
2. Inventory every modified and untracked file. Classify it as intentional migration work, generated test evidence, local tooling output, or unrelated user work.
3. Preserve the current reference-lesson implementation. Finish or safely isolate it; do not delete it to obtain a clean status.
4. Exclude local Playwright/MCP output and other transient artifacts appropriately without hiding required test fixtures.
5. Reproduce current narrow test results before making architectural changes.
6. Update the handoff with any state that differs from the existing reports.

**Exit criteria:** The worktree is understood, no user work has been lost, transient artifacts are not staged, and the current migration can be built and tested reproducibly.

### Workstream 1 — Complete the curriculum content pipeline

Replace the single-lesson allowlist with a general, build-time content pipeline over the existing authoritative curriculum.

Implement:

- Discovery and validation of every lesson under `phases/*/*/`.
- Stable typed lesson records containing phase, lesson number, slug, title, type, languages, prerequisites, time, source path, documentation, quiz, figures, code links, provenance, and previous/next navigation.
- Build-time or cached loading that does not scan hundreds of directories on every production request.
- Trusted Markdown rendering for the existing lesson format.
- The existing lesson mechanisms: headings and anchors, table of contents, code blocks and copy controls, tables, callouts, links, Mermaid, registered figures, quizzes, attribution, source links, and previous/next navigation.
- Safe per-feature fallback states. One malformed optional figure must not make the entire lesson unreadable.
- Deterministic `generateStaticParams` or equivalent route generation for every lesson.
- Compatibility for legacy `lesson.html` URLs, query parameters, and hashes.
- Validation failures that name the exact source file and invalid field.

Update the catalogue so lesson cards and search results open internal `/lessons/<phase>/<lesson>` routes. GitHub remains an explicit “view source” action, not the primary lesson destination.

Add representative tests across lesson shapes, including:

- plain Markdown lesson;
- code-heavy lesson;
- Mermaid lesson;
- interactive-figure lesson;
- quiz lesson;
- lesson with missing optional content;
- invalid source fixture;
- previous/next boundaries;
- direct navigation to a heading hash;
- mobile and desktop reading layouts.

Do not manually rewrite hundreds of lessons into React components.

**Exit criteria:** Every curriculum lesson resolves internally, catalogue navigation stays on Codeology, representative mechanisms work, and an automated route test proves there are no unexplained missing or duplicate lessons.

### Workstream 2 — Finish shared application behavior

Preserve or complete the behavior users rely on across pages:

- Shared header and footer.
- Desktop and responsive navigation.
- Search/command interface and keyboard controls.
- Persisted light/dark/system theme without hydration flashes.
- Account dropdown states for signed-out and signed-in users.
- Focus management, skip links, reduced motion, accessible names, and usable touch targets.
- Canonical metadata, source attribution, legacy redirects, query parameters, and hashes.
- Loading, empty, not-found, validation, offline/network, and safe error states.

Use `learn.akshatporwal.dev` as the canonical visual and behavioral reference and `test.learn.akshatporwal.dev` only as the test environment. Preserve the established pixel-editorial design. Do not introduce generic component-library styling.

Exact pixel identity is not required where rendering engines, accessibility corrections, or framework mechanics cause harmless differences. Material deterioration is not acceptable: missing content, broken hierarchy, substantially different spacing or typography, overflow, unusable controls, lost responsive behavior, or a visibly different product shell must be corrected.

**Exit criteria:** The shell and primary navigation work at desktop and mobile sizes, theme and search behavior persist, accessibility checks pass, and comparison evidence shows no material UI deterioration.

### Workstream 3 — Migrate assessments and certification interactions

Implement the planned assessment route and preserve the existing certification behavior:

- Resolve legacy assessment URLs into stable Next.js routes.
- Load and validate the existing assessment manifests and question schema.
- Support single- and multiple-response questions correctly.
- Implement navigation, answer state, completion, scoring, explanations, domain/objective breakdowns, restart, and empty/error states.
- Preserve the independent-course disclaimer and avoid claims of official affiliation or guaranteed passing.
- Keep learner-facing questions and explanations separate from any assessor-only information.
- Add keyboard, accessibility, refresh/direct-link, mobile, and scoring tests.
- If authenticated assessment persistence exists in the legacy product, route it through the same progress service boundary; otherwise preserve current local behavior without inventing credential claims.

**Exit criteria:** All existing assessment and certification routes are functional in Next.js and their core user journeys pass browser tests.

### Workstream 4 — Implement production FastAPI infrastructure adapters

Retain the existing service/repository protocols and replace in-memory dependencies with production adapters selected through configuration and dependency injection.

#### Authentication and authorization

- Verify Supabase access tokens using the correct issuer, signature/JWKS, audience where configured, expiry, and subject.
- Resolve a typed current user at the API boundary.
- Enforce ownership again in repositories and database policies; never rely only on a browser-supplied user ID.
- Keep browser sessions compatible with the existing Supabase Auth accounts and OAuth callback behavior.

#### PostgreSQL repositories

Implement ownership-scoped repositories for:

- lesson progress;
- AI provider connections and selected model;
- CV documents;
- CV analyses and their lifecycle;
- any existing account preferences required by the migrated UI.

Preserve current table contracts and RLS policies unless a narrowly justified, reviewed migration is required. Database migrations must be additive, reversible where practical, tested against a non-production database, and must not expose or rewrite user data unnecessarily.

#### Storage and Vault

- Upload CV files to the existing private Supabase Storage bucket using collision-safe, ownership-scoped paths.
- Generate only short-lived authorised access when required.
- Delete database and storage records consistently, with safe retry/idempotency behavior.
- Store provider credentials using the existing Vault/secret-reference design. Never return plaintext credentials after connection and never log them.
- Preserve the ability to connect, update model/provider selection, verify, disconnect, and rotate credentials.

#### Document processing

- Support the legacy accepted formats, including PDF, DOCX, and plain text where currently supported.
- Validate filename, extension, MIME signature, maximum size, page/character limits, and empty/encrypted/malformed documents.
- Perform bounded text extraction with timeouts and safe errors.
- Treat uploaded documents as hostile input and prevent path traversal, decompression bombs, executable content, and unbounded parsing.

#### Provider integrations

- Implement provider adapters through the existing provider protocol.
- Preserve provider and model selection; validate all selections server-side using configuration-backed allowlists.
- Support the currently promised Gemini flow and any other providers exposed in the production UI.
- Use supported model identifiers rather than guessed names, and map provider failures into actionable safe error codes: invalid key, unavailable model, quota/rate limit, timeout, malformed response, blocked content, provider outage, and internal failure.
- Keep prompts and response validation versioned and deterministic enough for regression tests.
- Never expose provider keys or raw unsafe provider responses to the browser or logs.

#### Operational safeguards

- Add bounded timeouts, request-size limits, rate limiting or an equivalent abuse boundary, structured logs, request IDs, redaction, health/readiness semantics, and idempotency where retries can duplicate work.
- Maintain the documented OpenAPI schema and regenerate the checked TypeScript client when contracts change.
- Add integration tests using a local/test Supabase environment or faithful isolated doubles. Real personal CVs and keys must not become fixtures.

**Exit criteria:** With configured test credentials, FastAPI performs real authenticated progress and CV operations against non-production Supabase infrastructure; all ownership, redaction, failure, and idempotency tests pass; production mode does not use in-memory repositories or fake providers.

### Workstream 5 — Connect the Next.js product UI to FastAPI

Replace synthetic product state with the generated API client and real session-aware calls.

Implement:

- Supabase-compatible sign-in, callback, sign-out, session refresh, and protected-route behavior.
- Same-origin browser calls through the Next.js proxy/BFF without duplicating business rules.
- Anonymous lesson progress locally and authenticated progress reconciliation without losing either side.
- Account settings for provider, model, connection status, masked credential identity, update/disconnect, and clear failure guidance.
- CV upload, text extraction status, role/context inputs, consent, analysis submission, progress, success, retry, and detailed safe failures.
- Saved CV and analysis history, pagination, opening results, rerunning where supported, and confirmed deletion of both metadata and private files.
- Readiness/employability scoring and recommendations using the existing result contract.
- Correct loading, stale-session, reauthentication, offline, partial-success, empty, and retry states.
- No secret, CV body, or provider response persisted in browser storage unless the existing privacy contract explicitly requires it.

Do not make authenticated functionality available only behind development fixture flags. Development fixtures may remain as an explicit test mode that cannot be enabled accidentally in production.

**Exit criteria:** A fresh synthetic user can sign in, save progress, connect a test provider key, upload an accepted CV, receive a validated analysis, revisit it, and delete it; a second user cannot read or mutate any of those records.

### Workstream 6 — Deployment and environment readiness

Prepare—without deploying unless separately authorised—the new applications for preview and eventual cutover.

Implement and document:

- A Vercel project/build configuration whose root or working directory correctly builds `apps/web`, rather than the legacy `site/` output.
- A deployable FastAPI configuration. Prefer the already selected supported target if one is documented; otherwise choose a portable target compatible with request sizes, timeouts, the Supabase region, and expected AI calls, and record the decision.
- Same-origin `/api/v1` routing from the web deployment to FastAPI.
- Separate local, preview/test, and production environment templates with placeholders only.
- Exact required variable names, ownership, rotation expectations, and which runtime receives each value.
- Supabase Auth redirect URLs, allowed origins, cookie/security settings, and test-domain behavior.
- Legacy `.html` redirects, canonical URLs, cache rules, and a rollback procedure.
- Health and readiness checks suitable for deployment verification.
- A no-data-loss cutover checklist and immediate rollback plan.

Do not change `learn.akshatporwal.dev`, `test.learn.akshatporwal.dev`, Vercel, Supabase, DNS, GitHub secrets, or production data without explicit user authorization. Configuration files and deployment documentation may be prepared and tested locally.

**Exit criteria:** Production builds are reproducible; a reviewer has exact preview deployment steps; the legacy deployment remains recoverable; and no live environment has been changed without approval.

### Workstream 7 — Quality gates and regression closure

Repair failures at their source and make the migration suite part of the required repository gates.

Required checks include:

```bash
npm run check:precommit
npm run check:route-parity
npm run test:api
npm run test:web
npm run test:web:e2e
npm run test:migration
npm run typecheck:migration
npm run build:migration
npm run ci
git diff --check
```

Also:

- Reproduce and fix the translation-workflow contract failure rather than labelling it unrelated indefinitely.
- Ensure transient `.playwright-mcp/` files do not fail provenance or become committed evidence.
- Run browser smoke tests in Chromium and WebKit at representative desktop and mobile sizes.
- Verify direct loading, navigation, refresh, back/forward, hashes, theme, signed-out, signed-in, failure, and reduced-motion states.
- Test that every known legacy public URL resolves correctly.
- Test all lesson routes for successful generation without opening every page manually.
- Add explicit security tests for cross-user access, untrusted uploads, secret redaction, invalid/expired sessions, provider failures, and deletion.
- Review staged files for secrets, personal data, generated caches, unrelated curriculum edits, and attribution loss.

Tests may be reorganised or made more deterministic, but acceptance must not be weakened. A browser flake must be diagnosed and stabilised rather than hidden behind excessive retries.

**Exit criteria:** Every required command exits zero from a clean checkout with documented environment prerequisites, and no serious or critical accessibility or security regression remains.

### Workstream 8 — Evidence, review, and handoff

Update the migration evidence so it describes production reality rather than the earlier mock/reference scope.

- Update the route-parity manifest and generated dashboard.
- Mark routes according to actual evidence; do not call fixture-only behavior production-complete.
- Record architecture decisions, environment assumptions, migrations, dependencies, and rollback paths.
- Provide a concise legacy-to-new functionality matrix with no unexplained omissions.
- Record the exact commits and validation results.
- Provide comparison screenshots for material shared-shell and lesson-reader surfaces.
- Record harmless visual deviations instead of blocking indefinitely on pixel-level rasterisation differences.
- Clearly list any operation still requiring user-authorised deployment or production credentials.

**Exit criteria:** Another engineer can reproduce the result, understand every remaining external action, and verify functionality without relying on chat history.

## 5. Priority order for completing this today

If sequencing is necessary, preserve this order:

1. Protect the current dirty lesson work.
2. Generalise lesson loading and make every catalogue lesson internal.
3. Restore shared shell, search, navigation, theme, and URL behavior.
4. Implement assessments.
5. Implement real authentication and Supabase-backed FastAPI repositories.
6. Implement Storage, Vault, document extraction, and provider adapters.
7. Connect the real CV, account, and progress frontend workflows.
8. Prepare web/API deployment configuration and rollback documentation.
9. Make all required gates green and update evidence.

Do not spend the majority of the implementation window perfecting harmless screenshot differences while major functionality is still missing. Visual work becomes blocking when it constitutes material deterioration or an accessibility failure.

## 6. Explicit non-goals

The following are not required to complete this migration unless they are already observable production behavior:

- Replacing Supabase PostgreSQL, Auth, Storage, or Vault with self-hosted equivalents.
- Redesigning the site or replacing its visual identity.
- Rewriting every lesson manually as React components.
- Moving or mass-formatting curriculum source directories.
- Introducing microservices, Kubernetes, a queue, or a vector database without a current feature requiring them.
- Implementing the future RAG assistant, repository assessment platform, employer profiles, or mobile applications as part of this cutover.
- Achieving byte-identical screenshots where browsers rasterise otherwise equivalent layouts differently.
- Deploying, merging, or modifying production infrastructure without explicit authorization.

The architecture should leave clean seams for future RAG and assistant features, but speculative features must not delay restoration of current functionality.

## 7. Definition of Done

The migration is done only when all of the following are true:

### Product functionality

- Every currently published curriculum lesson is reachable and readable through an internal Next.js route.
- Catalogue links open lessons inside Codeology; GitHub is retained as a separate source action.
- Academy, About, Credits, Assurance, Glossary, Catalogue, Roadmap, Certifications, certification tracks, assessments, lesson reader, CV Analysis, and account settings are implemented or deliberately routed to an equivalent compatibility surface with no loss of behavior.
- Shared navigation, search, theme, account menu, responsive layouts, keyboard behavior, legacy URLs, hashes, query parameters, metadata, and attribution work.
- Anonymous and authenticated progress behave predictably and reconcile without data loss.
- A real authenticated synthetic-user CV journey succeeds end to end in a non-production environment: provider connection, upload/extraction, analysis, saved history, reopening, and deletion.
- Failure messages are actionable and safe rather than a generic `failed` state.

### Architecture and security

- Next.js owns presentation and browser/session boundaries; FastAPI owns trusted business operations.
- Production configuration cannot select fake providers or in-memory persistence accidentally.
- Supabase Auth, PostgreSQL/RLS, Storage, and Vault remain correctly enforced.
- Users cannot access another user’s progress, keys, CVs, analyses, or settings.
- Provider keys and CV contents do not appear in logs, browser storage, screenshots, error messages, generated artifacts, or version control.
- OpenAPI and the generated TypeScript client agree.

### Quality and operations

- `npm run check:precommit`, `npm run test:migration`, `npm run typecheck:migration`, `npm run build:migration`, and `npm run ci` all pass, along with the narrower commands listed in Workstream 7.
- Browser coverage includes Chromium and WebKit at mobile and desktop sizes, with no serious or critical accessibility findings.
- There is no unexplained missing route, lesson, assessment, source attribution, or legacy URL.
- There is no material visual deterioration compared with `learn.akshatporwal.dev`.
- The branch contains no secrets, personal CVs, transient browser output, unintended generated files, or unrelated curriculum modifications.
- The work is committed in logical reviewable milestones and the worktree is clean except for explicitly documented user-owned files.
- Local, preview, production, rollback, and post-deployment verification instructions are complete.

### Completion report

The final handoff must state:

- what changed;
- commits created;
- exact commands run and their exit results;
- functionality-parity result;
- security and data-preservation result;
- preview/deployment steps still requiring explicit authorization;
- any harmless documented deviations.

Do not describe the task as complete while a key Definition of Done item is mocked, planned, disabled in production, untested, or silently delegated to the legacy site. A narrowly documented compatibility route is acceptable only when it provides the same observable functionality and has a clear tested cutover/rollback boundary.

## 8. Recommended commit sequence

Use this as guidance rather than an inflexible requirement; split further when it improves reviewability:

1. `chore(migration): reconcile branch state and evidence`
2. `feat(web): load the complete lesson curriculum`
3. `fix(web): route catalog lessons internally`
4. `fix(web): restore shared application behavior`
5. `feat(web): migrate assessment journeys`
6. `feat(api): add Supabase authentication and repositories`
7. `feat(api): add CV storage and document extraction`
8. `feat(api): add production AI provider adapters`
9. `feat(web): connect account progress and CV workflows`
10. `chore(deploy): prepare web and API cutover`
11. `test(migration): close parity and regression gates`
12. `docs(migration): record completion and rollback plan`

Do not force a commit when a slice is incomplete or failing. Do not combine unrelated curriculum changes with migration commits.
