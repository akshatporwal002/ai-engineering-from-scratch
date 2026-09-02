# Development merge review — 2026-09-02

## Acceptance and scope

The repository owner reviewed the running local migration and stated: "i've checked and it seems to look fine. I approve it". The owner subsequently authorized merging into `dev` and fixing CI. This is acceptance of the appearance and behavior they inspected, not a claim that they reviewed every route, browser, viewport, or immutable image comparison. The detailed route-parity evidence retains its existing classifications.

This change prepares the existing Next.js/FastAPI migration for `dev`. It does not deploy production, change hosting architecture, apply database migrations, or exercise live provider credentials.

## CI corrections

- Generate maintained curriculum artifacts with the web package's `pretest` lifecycle so standalone web tests work on a clean checkout without a previously built `site/certification-data.js`.
- Scope the glossary's accessible search-control lookup to its filter rail. Keep the full corpus, existing result assertions, and unchanged timeout; add initial-count and source-immutability assertions.
- Register the original platform workflow, deployment guide, and Python launcher under Codeology ownership. These paths do not exist in the pinned upstream baseline; fabricating imported adaptation records would misattribute them.
- Add an ownership regression test covering those three migration paths.

## Validation and merge gates

Run `npm run ci`, `npm run ci:migration`, and the complete Chromium/WebKit browser suite, then require successful GitHub checks on the proposed merge before updating `dev`. Keep generated artifacts out of the commit. Any integration rollback should use a reviewed revert, never a force-push.

Production remains a separate gate: build the API image, configure and test a non-production Supabase/OAuth/provider environment, apply the additive migration there, and obtain explicit authorization before production cutover.
