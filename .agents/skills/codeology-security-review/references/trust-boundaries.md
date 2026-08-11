# Codeology trust boundaries

Review these boundaries whenever touched:

| Boundary | Principal risk | Required control |
|---|---|---|
| Browser to application API | forged identity or input | authenticated session, CSRF policy, schema validation, rate limits |
| GitHub to webhook receiver | spoofing or replay | signature verification, delivery deduplication, least-privilege app permissions |
| Public repository to ingestion worker | hostile files and resource exhaustion | limits, safe path handling, no implicit execution, content-type verification |
| Worker to model provider | secret or source leakage | bounded prompt construction, redaction, retention policy, provider allowlist |
| Model output to evidence policy | hallucinated claims | citation validation, deterministic facts, escalation and abstention |
| Evidence to public profile | privacy or overclaiming | learner consent, assurance labels, revocation and provenance |
| CI to production | supply-chain compromise | protected environments, pinned actions, scoped tokens, review gates |

Learner-controlled CI can support practice evidence but is not independently verified evidence.
