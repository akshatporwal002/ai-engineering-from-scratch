# Codeology v1 content schema contract

Codeology's public learning, scenario and evidence records use strict JSON Schema 2020-12 contracts under `content/codeology/schemas/v1/`. The schemas establish stable vocabulary before the first pilot pathway is selected. They do not name a target role or claim that any competency model has been validated.

## Why this boundary exists

The imported academy is trusted curriculum content. Codeology's pathway and assessment layer adds a different kind of claim: that a scenario measures particular engineering skills and that an artifact supports a precisely labelled evidence state. Those claims must be versioned, inspectable and reproducible independently of page copy.

The v1 contracts provide seven public entities:

| Entity | Stable identity | Purpose |
|---|---|---|
| Job-task analysis | `analysisId` + `analysisVersion` | Ground a target role and its tasks in cited evidence, limitations and multidisciplinary review. |
| Assessment blueprint | `blueprintId` + `blueprintVersion` | Prove task-to-scenario-to-criterion-to-skill coverage and record mapping review. |
| Skill | `skillId` + `skillVersion` | Define one observable competency and the evidence it should elicit. |
| Pathway | `pathwayId` + `pathwayVersion` | Define a target-role route, skill references and an acyclic prerequisite graph. |
| Scenario | `scenarioId` + `scenarioVersion` | Define an open-tool, learner-owned repository task and its public checks. |
| Rubric | `rubricId` + `rubricVersion` | Separate hard rejects from anchored quality criteria and map them to skills. |
| Evidence | `evidenceId` + `evidenceVersion` | Bind observations to an immutable repository snapshot, policy and assurance dimensions. |

Every reference to a versioned entity includes both its stable ID and exact positive integer version. Display names may change without changing IDs. A published version is immutable; corrections create a later version.

## Source layout

```text
content/codeology/
  schemas/v1/
    common.schema.json
    assessment-blueprint.schema.json
    job-task-analysis.schema.json
    skill.schema.json
    pathway.schema.json
    scenario.schema.json
    rubric.schema.json
    evidence.schema.json
  job-task-analyses/
  assessment-blueprints/
  skills/
  pathways/
  scenarios/
  rubrics/
  evidence/
```

Entity directories may remain absent or empty before the first pilot is approved. Schema files are Codeology-original public contracts and resolve through `content-sources.yml`.

## Publishing invariants

`python scripts/audit_codeology_content.py` validates JSON shape and the relationships JSON Schema alone cannot establish:

- Every ID/version pair is unique, and versions are contiguous from 1.
- Every skill, pathway, scenario and rubric reference resolves to an exact version.
- A pathway prerequisite graph contains no missing nodes, self-edges or cycles.
- Every pathway references one exact job-task-analysis version and uses its target-role title.
- Every job task traces to declared evidence sources, and the synthesis classifies every task exactly once.
- A published job-task analysis uses at least two evidence-source types, states limitations and participant-privacy handling, declares that the public record contains no personal data, and records engineering, hiring and assessment approval for every in-scope task.
- A published pathway references a published job-task analysis; a draft research record cannot support a published competency claim.
- Every blueprint mapping resolves an in-scope JTA task, exact scenario and rubric versions, existing public criteria, and the same versioned skills those criteria declare.
- A published blueprint covers every in-scope job task and every pathway skill, and records engineering, hiring and assessment approval for every mapping.
- A published pathway references a reciprocal published blueprint using the same JTA version. Schema strictness rejects mastery-percentage shortcuts and undeclared weighting fields.
- A pathway and each scenario reference one another.
- A scenario and rubric reference one another.
- Every rubric criterion has a scenario mapping, and its mapped skills exactly match the public rubric.
- Rubric anchors remain ordered `insufficient`, `developing`, `competent`, `strong`.
- Hard rejects state an observable rejection condition; quality criteria cannot masquerade as hard rejects.
- Public brief paths are relative, remain inside `content/codeology/`, and resolve to an existing Markdown file.
- `verified` evidence requires controlled-follow-up artifact assurance; weaker evidence cannot be relabelled upward.
- Evidence line ranges are ascending and criterion/skill references resolve to the assessed rubric.
- Unknown fields fail rather than being silently ignored.

The audit runs through `npm run check:codeology-content`, `npm run check:content`, `npm run check:precommit`, and `npm run ci`.

## Learner and assessor separation

Everything under `content/codeology/` is treated as public and may be loaded by a learner-facing companion. The public contract may contain:

- scenario briefs and constraints;
- open-tool and minimum-resource guidance;
- public checks;
- public rubric criteria and anchors;
- criterion-to-skill mappings;
- honest assurance ceilings.

It must not contain hidden tests, private grader prompts, calibration answers or escalation thresholds. The audit rejects those fields and assessor-only directory names beneath the public root. Future assessor packages must live behind a separate access boundary and must never be compiled into the academy or learner companion context.

## Trust and assurance rules

The evidence schema keeps three independent dimensions:

- `artifactAssurance`: how independently the artifact was observed or tested;
- `identityAssurance`: what identity link, if any, was checked;
- `administrationMode`: how the assessment was administered.

These dimensions must not be collapsed into one badge. A learner-controlled check records what that workflow reported; it does not become independently established runtime behavior. The deterministic policy engine derives an evidence state under the versioned assessment charter. A model may later provide bounded criterion judgments, but cannot award a state.

## Role-selection gate

The schemas deliberately do not publish a placeholder pilot pathway. Before a pathway can be `published`, Codeology must conduct a versioned target-role job-task analysis, trace tasks to public or safely anonymized research references, classify scope, state limitations, and record approval from software-engineering, hiring-manager and assessment-specialist perspectives. Its published assessment blueprint must then show how every in-scope task and pathway skill is elicited by exact public scenarios, rubrics and criteria. A JTA, blueprint or pathway may remain `draft`, but draft research cannot appear as validated competencies or employer evidence.

Research `reference` values are provenance metadata, not fetch instructions. The static audit never requests them. Any future link checker or ingestion service must allowlist protocols and hosts, apply network limits, and treat referenced documents as untrusted. Public reviewer IDs must be non-personal pseudonyms, and public summaries must exclude names, contact details, raw interview transcripts and other participant data.

## Authoring sequence

1. Create and validate a `job-task-analysis.schema.json` record for the chosen target role.
2. Define 8–12 versioned skills with observable evidence expectations.
3. Define one pathway and an acyclic prerequisite graph.
4. Author a public scenario brief and learner-owned submission limits.
5. Author the public rubric, distinguishing hard rejects from quality criteria.
6. Add reciprocal scenario/rubric and criterion/skill mappings.
7. Build and review the assessment blueprint across all selected tasks, scenarios, criteria and skills.
8. Run `npm run check:codeology-content` before generating any site data.
9. Run the full `npm run ci` gate before committing or publishing.

The first content compiler will consume only records that pass this audit and will emit a separate Codeology data artifact rather than modifying the imported `site/data.js` domain model.
