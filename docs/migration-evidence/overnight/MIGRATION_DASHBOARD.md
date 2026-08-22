# Next.js migration dashboard

> Generated from `apps/web/content/route-parity.json`; do not edit by hand.

## Coverage

- Legacy HTML routes: 12
- Complete: 11
- Partial: 0
- Planned: 1
- Excluded: 0
- Accounted for: 11 implemented or explicitly classified; 1 planned

## Route matrix

| Legacy route | Next.js target | Kind | Status | Required evidence |
|---|---|---|---|---|
| `/index.html` | `/` | academy | complete | `public-routes:academy`<br>`public-routes:paired-evidence` |
| `/about.html` | `/about` | editorial | complete | `public-routes:about`<br>`public-content:editorial-source` |
| `/assessment.html` | `/assessments/[assessment]` | assessment | planned | `mock-product:assessment` |
| `/assurance.html` | `/assurance` | editorial | complete | `public-routes:assurance`<br>`public-content:editorial-source` |
| `/catalog.html` | `/catalog` | catalog | complete | `public-routes:catalog`<br>`public-content:lesson-search` |
| `/certification.html?id=claude-ccao-f` | `/certifications/[track]` | certification-track | complete | `public-routes:certification-track`<br>`public-content:certification-validation` |
| `/certifications.html` | `/certifications` | certification-program | complete | `public-routes:certifications`<br>`public-content:certification-validation` |
| `/credits.html` | `/credits` | editorial | complete | `public-routes:credits`<br>`public-content:provenance` |
| `/cv-analysis.html` | `/cv-analysis` | presentation-only | complete | `public-routes:cv-analysis`<br>`public-content:presentation-boundary` |
| `/glossary.html` | `/glossary` | glossary | complete | `public-routes:glossary`<br>`public-content:glossary-search` |
| `/lesson.html` | `/lessons/[...slug]` | lesson | complete | `reference-lesson:reader`<br>`reference-lesson:paired-evidence` |
| `/prereqs.html` | `/roadmap` | roadmap | complete | `public-routes:roadmap`<br>`public-content:prerequisites` |

## Interpretation

A `complete` row has a corresponding Next.js page and named automated evidence. A `planned` row is deliberately not represented as migrated. Route existence and one-to-one legacy coverage are enforced by `check-route-parity.mjs`; dashboard drift is enforced by this generator's `--check` mode.
