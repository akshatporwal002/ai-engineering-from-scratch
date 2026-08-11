---
name: codeology-sync-upstream
description: Inspect, classify, attribute, validate, and prepare updates from the AI Engineering from Scratch upstream remote. Use when checking for new upstream lessons, merging upstream changes, resolving fork divergence, or updating imported-content provenance. Never auto-merge or publish upstream changes.
---

# Codeology Upstream Sync

Read [references/sync-policy.md](references/sync-policy.md) before changing imported paths.

1. Verify `origin`, `upstream`, the current branch and a clean or understood working tree.
2. Fetch upstream without changing local files.
3. Compare the last reviewed upstream commit with `upstream/main`; classify additions, modifications, renames, removals, licence changes and adapter conflicts.
4. Preserve upstream files where possible. Put Codeology metadata and adaptation in sidecars rather than editing imported lessons.
5. Apply source labels through `content-sources.yml` when that registry exists.
6. Generate a review report containing commit range, changed paths, source/licence status, conflicts, migrations and validation results.
7. Run upstream audits, Codeology provenance checks, link checks and relevant visual smoke tests.
8. Stop on missing attribution, changed licensing, broken adapters or validation failures.
9. Prepare a reviewable branch or pull request only when authorized. Never auto-merge.
