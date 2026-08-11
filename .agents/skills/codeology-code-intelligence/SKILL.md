---
name: codeology-code-intelligence
description: Explore unfamiliar Codeology code, trace call paths, map dependencies, and estimate change impact using repository search first and GitNexus only when it is installed and legally approved. Use before cross-cutting refactors, inherited UI changes, API contract changes, or debugging non-local behavior.
---

# Codeology Code Intelligence

1. Start with `rg`, repository documentation, tests, imports and call sites.
2. Identify entry points, data transformations, side effects, consumers and generated outputs.
3. For a proposed change, list direct callers, indirect consumers, tests, routes and data contracts that may be affected.
4. If GitNexus is installed and approved, read [references/gitnexus.md](references/gitnexus.md) and use graph results to supplement—not replace—source inspection.
5. Distinguish source-code dependency analysis from curriculum semantics. A code graph does not determine lesson prerequisites, provenance or assessment validity.
6. Record uncertainties and verify high-risk relationships directly in code.
7. Feed the impact report into `$codeology-engineering-workflow` before implementation.

Do not install, vendor or deploy GitNexus from this skill. Its licence and third-party execution require an explicit decision.
