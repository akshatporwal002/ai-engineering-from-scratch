# Codeology content contract

This directory is the canonical home for original Codeology learning and assessment content. Imported AI Engineering from Scratch files remain in their existing paths and are not copied here.

Planned structure:

```text
content/codeology/
  pathways/   # Ordered skill and scenario routes
  lessons/    # Original Codeology explanatory material
  scenarios/  # Repository-based engineering briefs and public checks
  rubrics/    # Versioned public rubric contracts
  policies/   # Versioned assurance, assessment and evidence policies
```

Every artifact must have a stable lowercase identifier, an explicit schema version, Codeology source ownership, and references only to existing prerequisite or skill IDs. Assessor-only prompts, hidden fixtures, calibration answers and escalation thresholds must not live beneath this public content root.
