---
name: codeology-security-review
description: Review Codeology authentication, GitHub integration, repository ingestion, AI assessment, webhooks, APIs, secrets, persistence, file handling, deployment, and evidence publication for security and assessment-integrity risks. Use whenever a change crosses a trust boundary or handles learner-controlled input.
---

# Codeology Security Review

Treat repositories, commits, filenames, archives, Markdown, generated HTML, CI results, model output, and webhook payloads as hostile input.

Read [references/trust-boundaries.md](references/trust-boundaries.md), then:

1. Describe the assets, actors, entry points, trust boundaries, and attacker goals.
2. Trace authentication and authorization separately. Verify every sensitive operation is authorized server-side.
3. Validate input size, type, path, encoding, schema, and rate limits before processing.
4. Verify secrets never enter source, logs, model prompts, browser storage, artifacts, or learner-visible feedback.
5. Check for path traversal, archive bombs, injection, SSRF, XSS, unsafe redirects, replayed webhooks, confused-deputy access, and dependency risks.
6. Keep deterministic observations separate from AI judgments. Never let model output directly grant a skill or credential.
7. Require immutable commit identifiers and versioned scenarios/rubrics for assessed evidence.
8. Define abuse tests and failure behavior. Fail closed where a result affects assurance.
9. Report findings by severity, evidence, impact, and concrete remediation.

Do not recommend executing learner code on the application host. Controlled execution requires an isolated, disposable sandbox with strict network, CPU, memory, time and filesystem limits.
