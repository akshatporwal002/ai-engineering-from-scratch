---
name: codeology-audit-content
description: Validate Codeology lessons, pathways, scenarios, rubrics, imported sources, provenance, links, generated indexes, and publishing invariants. Use before committing or publishing content changes and when source labels, schemas, lesson counts, or generated pages may have drifted.
---

# Codeology Content Audit

1. Identify whether each changed path is upstream-imported, Codeology-original, adapted, generated or learner-created.
2. Run `npm run check:content` and `npm run check:skills`.
3. Apply [references/publishing-gates.md](references/publishing-gates.md).
4. Validate stable IDs, schemas, prerequisite edges, rubric-to-skill mappings, licences, attribution, links and source commit metadata.
5. Confirm generated files are produced by their canonical builders and are not manually edited.
6. Report failures with path, rule, evidence and remediation. Stop publication on any provenance, licence, schema or broken-link failure.
7. Treat README count drift separately when the existing main-branch automation is expected to self-heal it.

Do not silently repair source attribution or infer an unknown licence.
