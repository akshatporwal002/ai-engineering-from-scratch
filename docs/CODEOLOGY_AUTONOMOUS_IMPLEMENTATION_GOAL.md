# Codeology autonomous implementation goal

**Working branch:** `codex/dev`  
**Primary plan:** `docs/CODEOLOGY_PRODUCT_AND_IMPLEMENTATION_PLAN.md`  
**Operating rules:** `AGENTS.md` and `.agents/skills/codeology-*/SKILL.md`

## Progress

- **Stage 0 — complete:** repository-local maintainer skills, cross-platform commands, pre-commit checks, GitHub quality CI and manual Vercel deployment are committed on `codex/dev`.
- **Stage 1 — implemented locally, remote exercise pending:** the imported baseline, source registry, third-party notice, Codeology/override content contracts, deterministic provenance gate and review-only upstream intake workflow are implemented and locally validated. The workflow's first branch/PR run awaits an explicitly authorized push of `codex/dev` and GitHub Actions execution.
- **Stage 2 — complete locally:** the shared shell centralizes Codeology product/source configuration, navigation, footer ownership and design tokens; rebrands the public chrome; adds persistent upstream attribution; and enforces pure white/black canvases with rounded/translucent controls. The homepage leads with the learn/build/prove proposition; the lesson reader carries a pinned-source badge; and the imported glossary, 503-lesson catalog and 20-phase learning map retain their core interaction contracts. The map now distinguishes browser-local lesson activity from assessed skill evidence while supporting accessible progressive glow. Homepage, lesson, glossary, catalog and skill-map desktop-light/mobile-dark baselines are stored with deterministic provenance, semantics, interaction, responsive-layout and contrast validators. Stage 3's assessment charter and first structured pathway schema are next.

## Objective

Continue implementing Codeology as a free, open-tool software-engineering learning and evidence platform built on the AI Engineering from Scratch curriculum and interface. Preserve the imported academy, establish transparent provenance, then add realistic repository-based scenarios, deterministic submission checks, calibrated AI-assisted assessment, evidence-backed skill progression and employer-readable proof of work.

Work autonomously through the ordered stages below while preserving user changes and keeping every completed feature committed on `codex/dev` or a short-lived `codex/*` branch merged into `codex/dev`. Do not push, merge to `main`, deploy production, purchase services, change repository visibility, or create external resources without explicit authorization.

## Operating loop

For each feature:

1. Read `AGENTS.md`, the product plan and every triggered Codeology skill completely.
2. Inspect the current branch, worktree and latest commits. Preserve unrelated changes.
3. Select the next incomplete stage item whose dependencies are satisfied.
4. Define acceptance criteria, tests, affected trust boundaries and rollback path.
5. Implement one thin, end-to-end slice using the existing architecture where practical.
6. Add or update deterministic tests and documentation.
7. Run the narrow test while iterating, then run `npm run ci`.
8. Review the diff for security, accessibility, provenance, hidden-grader leakage and generated files.
9. Commit the logical feature with a Conventional Commit subject on `codex/dev`.
10. Record completed work, evidence, open risks and the next recommended slice in this document or the product plan.
11. Continue without waiting when the next action is safe, reversible and already authorized. Stop for missing credentials, material product choices, destructive operations, licence ambiguity or production deployment approval.

## Ordered stages

### Stage 0 — Development foundation

- Maintain repository-local Codeology skills and validate them in CI.
- Maintain cross-platform audit/test/build commands in `package.json`.
- Keep the tracked pre-commit gate and GitHub quality workflow green.
- Keep preview and production deployment commands explicit and reproducible.
- Protect production through GitHub environment approval and Vercel secrets.

Exit gate: a clean clone can run `npm run setup:dev` and `npm run ci`; CI runs on development branches and pull requests; deployment remains manual.

### Stage 1 — Source and provenance foundation

- Record the imported upstream baseline commit.
- Add `content-sources.yml` and validate path ownership, licences and source metadata.
- Add third-party notices appropriate to retained imported material.
- Create `content/codeology/` and `content/overrides/ai-engineering-from-scratch/` contracts without moving upstream lessons.
- Implement an automated, review-only upstream change report.

Exit gate: every imported, original and adapted path resolves to correct source metadata, and licence/source failures block publishing.

### Stage 2 — Codeology shell and design system

- Centralize brand configuration and design tokens.
- Rebrand the public shell while retaining source attribution.
- Preserve the established editorial/pixel identity on pure white or black canvases with modern rounded/translucent components.
- Capture mobile and desktop visual baselines and accessibility checks.
- Keep imported lesson, glossary, search and roadmap behavior working.

Exit gate: representative pages pass visual, responsive, keyboard, reduced-motion and contrast checks without curriculum regression.

### Stage 3 — Structured pathway and scenario pilot

- Define versioned pathway, skill graph, scenario, rubric and evidence schemas.
- Build one pathway with 8–12 skills and at least three manual pilot scenarios before account work.
- Create public briefs/checks and keep assessor-only fixtures physically separate.
- Map criteria to skills and define honest assurance ceilings.

Exit gate: schemas validate deterministically and a learner can complete a scenario in their own editor and public repository using documented steps.

### Stage 4 — Submission preflight and repository protocol

- Define the learner-owned `codeology` repository manifest and stable lesson/scenario attempt IDs.
- Validate repository layout, commit SHA, scenario version, public checks, secret exposure and excluded files.
- Produce a local submission-readiness report.
- Never execute untrusted learner code on the application host.

Exit gate: malformed or unsafe submissions fail with actionable feedback; valid pilot submissions produce immutable packets.

### Stage 5 — Minimal stateful platform

- Introduce the smallest justified web application boundary for identity and durable state.
- Add GitHub OAuth/App permissions using least privilege.
- Store users, repository connections, submissions, scenario/rubric versions and audit events.
- Keep free reading available without an account.

Exit gate: an authenticated learner can bind a public repository and submit an immutable commit without broad GitHub permissions.

### Stage 6 — Assessment and calibration

- Establish deterministic facts before any model call.
- Add bounded, citation-backed rubric assessment with low-cost models and escalation.
- Keep the policy engine—not the model—responsible for skill state.
- Build calibration datasets, blinded human labels, stability tests, false-pass/fail metrics, cost reports and release thresholds.
- Version every model, prompt, rubric and policy input recorded in evidence.

Exit gate: held-out calibration meets documented thresholds, every judgment cites inspectable evidence, and uncertainty abstains or escalates.

### Stage 7 — Skill map and employer proof

- Connect learned, practised, demonstrated and verified states to distinct evidence.
- Make the skill tree progressively glow while remaining understandable without colour or animation.
- Link every claim to commits, checks, criteria, assessor version and assurance limits.
- Build opt-in employer proof cards and test comprehension with real reviewers.

Exit gate: employers can locate relevant evidence quickly and do not systematically overinterpret identity, authorship or job readiness.

### Stage 8 — Pilot and go/no-go

- Run the bounded learner and employer pilot defined in the product plan.
- Measure completion, abandonment, assessment agreement, rerun variance, cost, appeals, fairness probes and employer comprehension.
- Publish honest findings and decide whether controlled execution, private repositories or paid verification are justified.

Exit gate: the team has evidence for continuing, revising or stopping each major product assumption.

## Non-negotiable constraints

- Free imported learning content remains free and attributed.
- Learners may use their own editor, compute and AI tools.
- AI assistance is disclosed as allowed; the product does not claim unaided authorship.
- Learner-controlled CI is practice evidence, not independent verification.
- Hidden tests, grader prompts and calibration answers never enter learner companion context.
- Untrusted repositories are hostile input and are never executed without isolated disposable infrastructure.
- Upstream discovery may be automated; upstream merging and publishing require review.
- No credential or skill claim exists without inspectable evidence and an assurance label.
- No production deployment occurs implicitly.

## Copy-paste continuation prompt

```text
Continue the active Codeology implementation goal in docs/CODEOLOGY_AUTONOMOUS_IMPLEMENTATION_GOAL.md. Work from the next incomplete stage on codex/dev. Read AGENTS.md and every applicable .agents skill before acting. Preserve upstream curriculum and user changes, implement one thin tested feature at a time, run npm run ci, review security/accessibility/provenance, and commit each completed logical feature with a Conventional Commit. Continue autonomously while work is safe and authorized. Do not push, merge to main, deploy production, create paid resources, or make irreversible external changes without my explicit approval. If genuinely blocked by a material product decision or credentials, report the exact blocker and the safest next options.
```
