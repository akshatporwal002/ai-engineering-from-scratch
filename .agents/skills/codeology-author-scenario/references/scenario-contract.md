# Scenario contract

Use this checklist with the authoritative schemas in `content/codeology/schemas/v1/` and the assurance policy in `content/codeology/policies/assessment-charter.v1.json`.

## Preconditions

Do not author publishable scenario content until all of these are available:

- a named target role supported by a published `job-task-analysis.schema.json` record;
- a versioned pathway containing the task's exact skill references;
- an observable job task that permits several defensible implementations;
- a bounded starter codebase with known licence and provenance;
- a realistic free-tool and minimum-hardware completion route.

When these inputs are still exploratory, use `status: draft`. Never fill gaps by naming plausible-sounding competencies and marking them published.

## Public outputs

Keep learner-visible artifacts beneath the public content root:

```text
content/codeology/
  scenarios/<scenario-slug>/
    scenario.v1.json
    brief.md
    starter/
    public-checks/
  rubrics/<scenario-slug>.v1.json
  assessment-blueprints/<pathway-slug>.v1.json
```

The manifest must validate against `scenario.schema.json`; the rubric must validate against `rubric.schema.json`. Skill and pathway references must use exact IDs and versions from `skill.schema.json` and `pathway.schema.json` records.

The brief must state:

- inherited context and the requested outcome;
- functional and non-functional constraints;
- prerequisites and permitted tools, including the open-tool AI policy;
- expected time, dependencies, free-tool route and minimum hardware;
- public checks and what each check can establish;
- learner-owned repository and exact-commit submission expectations;
- a non-public-repository accommodation route;
- the scenario's honest artifact-assurance ceiling;
- ownership, licence and source provenance for starter material.

## Criteria and mapping

Each criterion measures an observable property, engineering decision or invalidating condition:

- Use `hard-reject` only for a specific condition that invalidates assessment of the task.
- Use `quality` for bounded judgment with public evidence expectations.
- Keep the four rubric levels ordered `insufficient`, `developing`, `competent`, `strong`.
- Map every criterion to at least one scenario-declared skill.
- Mark the skill most directly measured as `primary`; use `supporting` only when the evidence is genuinely indirect.
- Keep scenario mappings and rubric skill references identical. The content audit rejects drift.
- Update the pathway's `assessment-blueprint.schema.json` record so the job task, scenario, rubric criteria and versioned skills remain connected.
- Reuse skills across several contexts; one criterion result is not durable competency evidence.

Avoid formatting preferences, framework trivia, inaccessible wording and requirements with only one acceptable implementation.

## Public and assessor separation

Public content may contain briefs, public checks, public rubric anchors, starter material, criterion mappings and assurance limits. It must not contain:

- hidden tests or expected hidden outputs;
- private grader or model prompts;
- calibration answers or held-out labels;
- escalation thresholds;
- credentials or private learner data.

Assessor-only packages require a separate access-controlled root that does not yet exist. Do not create one opportunistically while authoring a public scenario.

## Assurance

Learner-controlled checks may support `practised` evidence but are not independently verified runtime facts. Before controlled assessment infrastructure exists, set `assuranceCeiling` to `repository-observed`. A future increase requires matching controls and an assessment-charter update; wording alone cannot raise assurance.

Scenario authoring does not create `evidence.schema.json` records. Evidence begins only after an immutable repository, subdirectory, commit SHA, tree SHA, scenario version and rubric version are bound by the submission workflow.

## Validation and pilot gate

Run:

```bash
npm run check:codeology-content
npm run check:provenance
npm run ci
```

Also run every starter/public check using its documented free-tool route. Before publishing or enabling automated review, record a manual pilot that confirms:

- the starter pack initializes from a clean checkout;
- the brief can be understood without staff interpretation;
- at least one valid non-reference implementation completes the task;
- failure feedback is actionable;
- the task fits the stated time and hardware envelope;
- the criteria elicit the intended reasoning;
- no private material is reachable from learner-facing files or companions.
