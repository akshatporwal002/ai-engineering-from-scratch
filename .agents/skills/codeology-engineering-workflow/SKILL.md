---
name: codeology-engineering-workflow
description: Plan and deliver Codeology features, behavior changes, refactors, and defect fixes through a size-aware research, plan, test, review, and commit workflow. Use for implementation work that changes repository behavior, architecture, product code, automation, schemas, or public contracts.
---

# Codeology Engineering Workflow

Classify the change before editing:

- **Trivial:** one obvious local edit with no contract change.
- **Small:** one component or function with a clear implementation.
- **Standard:** several files, a new internal module, or one design decision.
- **Large:** cross-cutting behavior, external dependencies, public contracts, security boundaries, or multiple unresolved decisions.

Read `AGENTS.md` and the nearest relevant documentation. For standard or large work, read `docs/CODEOLOGY_PRODUCT_AND_IMPLEMENTATION_PLAN.md` and use [references/gates.md](references/gates.md).

## Workflow

1. Restate the expected outcome and non-goals.
2. Inspect existing paths and reuse working seams before introducing new structure.
3. Identify affected contracts, tests, generated files, provenance, accessibility, and security boundaries.
4. Produce an ordered plan of thin, independently verifiable slices for standard or large work.
5. Implement the smallest complete slice. For a defect, reproduce it first. For changed behavior, update the specification test first.
6. Run the narrowest relevant test after each slice, then `npm run ci` before handoff.
7. Review the diff for unintended curriculum changes, generated files, secrets, unsafe permissions, and attribution loss.
8. Commit one logical feature at a time on a non-main branch using Conventional Commits.

Never commit, push, merge, deploy, or modify external state unless the user authorized that action. Never weaken a failing check merely to make it pass.
