# Next.js migration dashboard

> Generated from `apps/web/content/route-parity.json`; do not edit by hand.

## Coverage

- Legacy HTML routes: 12
- Implemented: 7
- Interaction verified: 0
- Visual verified: 4
- Human reviewed: 0
- Planned: 1
- Excluded: 0
- Accounted for: 11 implemented or explicitly classified; 1 planned

## Route matrix

| Legacy route | Next.js target | Kind | Status | Required evidence |
|---|---|---|---|---|
| `/index.html` | `/` | academy | implemented | `public-routes:academy`<br>`public-routes:paired-evidence` |
| `/about.html` | `/about` | editorial | visual-verified | `public-routes:about`<br>`public-content:editorial-source` |
| `/assessment.html` | `/assessments/[assessment]` | assessment | planned | `mock-product:assessment` |
| `/assurance.html` | `/assurance` | editorial | visual-verified | `public-routes:assurance`<br>`public-content:editorial-source` |
| `/catalog.html` | `/catalog` | catalog | implemented | `public-routes:catalog`<br>`public-content:lesson-search` |
| `/certification.html?id=claude-ccao-f` | `/certifications/[track]` | certification-track | implemented | `public-routes:certification-track`<br>`public-content:certification-validation` |
| `/certifications.html` | `/certifications` | certification-program | implemented | `public-routes:certifications`<br>`public-content:certification-validation` |
| `/credits.html` | `/credits` | editorial | visual-verified | `public-routes:credits`<br>`public-content:provenance` |
| `/cv-analysis.html` | `/cv-analysis` | presentation-only | implemented | `public-routes:cv-analysis`<br>`public-content:presentation-boundary` |
| `/glossary.html` | `/glossary` | glossary | visual-verified | `public-routes:glossary`<br>`public-content:glossary-search` |
| `/lesson.html` | `/lessons/[...slug]` | lesson | implemented | `reference-lesson:reader`<br>`reference-lesson:paired-evidence` |
| `/prereqs.html` | `/roadmap` | roadmap | implemented | `public-routes:roadmap`<br>`public-content:prerequisites` |

## Interpretation

A route advances through `planned`, `implemented`, `interaction-verified`, `visual-verified`, and finally `reviewed`. Only `reviewed` is accepted parity, and it requires explicit human review metadata. Route existence, state/browser/viewport coverage, and visual test IDs are enforced by `check-route-parity.mjs`; dashboard drift is enforced by this generator's `--check` mode.
