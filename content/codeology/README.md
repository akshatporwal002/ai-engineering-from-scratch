# Codeology content contract

This directory is the canonical home for original Codeology learning and assessment content. Imported AI Engineering from Scratch files remain in their existing paths and are not copied here.

Planned structure:

```text
content/codeology/
  pathways/   # Ordered skill and scenario routes
  skills/     # Stable, fine-grained competency definitions
  lessons/    # Original Codeology explanatory material
  scenarios/  # Repository-based engineering briefs and public checks
  rubrics/    # Versioned public rubric contracts
  evidence/   # Immutable evidence records when issuance is implemented
  policies/   # Versioned assurance, assessment and evidence policies
  schemas/v1/ # Public JSON Schema contracts for Codeology domain records
  job-task-analyses/ # Versioned target-role task research and review evidence
```

Every artifact must have a stable lowercase identifier, an explicit schema version, Codeology source ownership, and references only to existing prerequisite or skill IDs. Assessor-only prompts, hidden fixtures, calibration answers and escalation thresholds must not live beneath this public content root.

The v1 schema contract is documented in `docs/CODEOLOGY_CONTENT_SCHEMA.md` and enforced by `python scripts/audit_codeology_content.py`. Every pathway references an exact job-task-analysis version, and publishing requires that analysis to pass its source, task-classification and reviewer gates. This prevents an implementation convenience from silently becoming a competency claim.
