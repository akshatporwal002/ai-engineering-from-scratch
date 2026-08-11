---
name: codeology-author-scenario
description: Create or revise realistic repository-based Codeology engineering scenarios, including briefs, manifests, public checks, versioned rubrics, skill mappings, provenance, starter material, evidence requirements, and validation. Use for pilot tasks and portfolio assessments rather than ordinary explanatory lessons.
---

# Codeology Scenario Authoring

Read [references/scenario-contract.md](references/scenario-contract.md).

1. Start from a realistic job task with a bounded inherited codebase and observable outcome.
2. State audience, prerequisites, constraints, allowed tools, expected time, public checks, submission contract and assurance ceiling.
3. Design criteria that measure engineering judgment and behavior, not formatting preferences or hidden trivia.
4. Map every criterion to one or more declared skills and define evidence anchors for insufficient, partial and strong performance.
5. Separate the public brief and checks from hidden assessor material.
6. Version the scenario and rubric independently. Bind assessments to both versions and an immutable commit SHA.
7. Include failure paths, accessibility where relevant, provenance and licence metadata.
8. Run deterministic schema and fixture tests. Pilot manually before enabling automated AI review.

Do not claim verified ability from learner-controlled tests alone. Do not author a task whose expected solution can only be one exact implementation.
