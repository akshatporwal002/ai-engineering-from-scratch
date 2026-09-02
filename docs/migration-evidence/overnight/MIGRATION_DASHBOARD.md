# Next.js migration dashboard

> Generated from `apps/web/content/route-parity.json`; do not edit by hand.

## Coverage

- Legacy HTML routes: 12
- Implemented: 0
- Interaction verified: 4
- Visual verified: 8
- Human reviewed: 0
- Planned: 0
- Excluded: 0
- Accounted for: 12 implemented or explicitly classified; 0 planned

## Route matrix

| Legacy route | Next.js target | Kind | Status | Required evidence |
|---|---|---|---|---|
| `/index.html` | `/` | academy | visual-verified | `public-routes:academy`<br>`public-routes:paired-evidence` |
| `/about.html` | `/about` | editorial | visual-verified | `public-routes:about`<br>`public-content:editorial-source` |
| `/assessment.html` | `/assessments/[assessment]` | assessment | interaction-verified | `assessments:journey` |
| `/assurance.html` | `/assurance` | editorial | visual-verified | `public-routes:assurance`<br>`public-content:editorial-source` |
| `/catalog.html` | `/catalog` | catalog | interaction-verified | `public-routes:catalog`<br>`public-content:lesson-search` |
| `/certification.html?id=claude-ccao-f` | `/certifications/[track]` | certification-track | visual-verified | `public-routes:certification-track`<br>`public-content:certification-validation` |
| `/certifications.html` | `/certifications` | certification-program | visual-verified | `public-routes:certifications`<br>`public-content:certification-validation` |
| `/credits.html` | `/credits` | editorial | visual-verified | `public-routes:credits`<br>`public-content:provenance` |
| `/cv-analysis.html` | `/cv-analysis` | presentation-only | interaction-verified | `public-routes:cv-analysis`<br>`public-content:presentation-boundary` |
| `/glossary.html` | `/glossary` | glossary | visual-verified | `public-routes:glossary`<br>`public-content:glossary-search` |
| `/lesson.html` | `/lessons/[...slug]` | lesson | interaction-verified | `reference-lesson:reader`<br>`reference-lesson:paired-evidence` |
| `/prereqs.html` | `/roadmap` | roadmap | visual-verified | `public-routes:roadmap`<br>`public-content:prerequisites` |

## Interpretation

A route advances through `planned`, `implemented`, `interaction-verified`, `visual-verified`, and finally `reviewed`. Only `reviewed` is accepted parity, and it requires explicit human review metadata. Route existence, state/browser/viewport coverage, and visual test IDs are enforced by `check-route-parity.mjs`; dashboard drift is enforced by this generator's `--check` mode.
