---
name: codeology-skill-stocktake
description: Audit Codeology learner and maintainer skills for triggering quality, duplication, staleness, provenance, excess context, unsafe access, and missing validation. Use after adding skills, changing AGENTS.md, installing agent tooling, or during periodic repository maintenance.
---

# Codeology Skill Stocktake

Keep learner skills in `skills/` and maintainer skills in `.agents/skills/`. Never merge those trust domains for convenience.

1. Inventory every `SKILL.md`, its purpose, trigger, resources, provenance, and apparent consumers.
2. Run `npm run check:skills`.
3. Classify each skill using [references/classification.md](references/classification.md).
4. Detect overlapping descriptions, duplicated instructions, stale paths, unreferenced resources, TODO placeholders, overly broad triggers, and bodies approaching 500 lines.
5. Verify `agents/openai.yaml` matches the skill and its default prompt names the skill.
6. Confirm learner companions cannot access hidden tests, assessor prompts, calibration sets, secrets, or escalation thresholds.
7. Recommend Keep, Improve, Merge, Retire, or Library-only with evidence. Do not delete or merge skills without explicit approval.
8. Estimate context savings when recommending consolidation.

Prefer a small daily set and on-demand specialist skills over an always-loaded catalogue.
