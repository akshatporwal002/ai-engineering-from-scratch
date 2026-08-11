---
name: codeology-author-scenario
description: Create or revise realistic repository-based Codeology engineering scenarios, public briefs, manifests, checks, versioned rubrics, skill mappings, starter material and manual-pilot records. Use for guided, intermediate or portfolio pilot tasks; scenario/rubric version changes; and work that maps job tasks to evidence. Do not use for ordinary lessons or private grader packages.
---

# Codeology Scenario Authoring

Read [references/scenario-contract.md](references/scenario-contract.md) and `docs/CODEOLOGY_CONTENT_SCHEMA.md` before editing.

1. Confirm the target role has completed, cited job-task analysis and the pathway already declares the exact versioned skills. Stop instead of inventing competencies when either input is missing.
2. Start from one realistic job task with a bounded inherited codebase, observable outcome and more than one valid implementation.
3. Create the public brief first: audience, context, constraints, prerequisites, open-tool policy, time, free-tool/minimum-hardware route, accommodation and learner-owned submission contract.
4. Define public checks as learner-controlled practice evidence. Set the scenario assurance ceiling no higher than `repository-observed` until Codeology operates the required independent controls.
5. Separate hard rejects from qualitative criteria. Use the charter's ordered `insufficient`, `developing`, `competent`, and `strong` anchors.
6. Map every rubric criterion to one or more scenario-declared skills, marking primary and supporting evidence deliberately.
7. Version the scenario and rubric independently; use exact versioned references in both directions. Never mutate a published version.
8. Keep all learner-visible material under `content/codeology/`. Never place hidden tests, grader prompts, calibration answers or escalation thresholds there.
9. Run `npm run check:codeology-content`, relevant starter/public checks, and `npm run ci`. Manually pilot the task before automated assessment or stronger claims.

Do not create evidence records during authoring. Do not claim demonstrated or verified ability from learner-controlled tests. Do not author a task whose expected solution can only be one exact implementation.
