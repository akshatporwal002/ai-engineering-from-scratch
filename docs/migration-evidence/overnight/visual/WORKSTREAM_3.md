# Workstream 3 public-route evidence

The acceptance run completed on 2026-08-23 with 36 of 36 Chromium tests passing. The suite blocks every non-loopback request and compares the local legacy application at `127.0.0.1:4173` with Next.js at `127.0.0.1:4174`.

## Coverage

| Route | Legacy fixture | Next.js route | Mobile pair | Desktop pair |
|---|---|---|---|---|
| Academy | `/index.html` | `/` | `workstream-3-academy-{legacy,next}-mobile.png` | `workstream-3-academy-{legacy,next}-desktop.png` |
| About | `/about.html` | `/about` | `workstream-3-about-{legacy,next}-mobile.png` | `workstream-3-about-{legacy,next}-desktop.png` |
| Credits | `/credits.html` | `/credits` | `workstream-3-credits-{legacy,next}-mobile.png` | `workstream-3-credits-{legacy,next}-desktop.png` |
| Glossary | `/glossary.html` | `/glossary` | `workstream-3-glossary-{legacy,next}-mobile.png` | `workstream-3-glossary-{legacy,next}-desktop.png` |
| Assurance | `/assurance.html` | `/assurance` | `workstream-3-assurance-{legacy,next}-mobile.png` | `workstream-3-assurance-{legacy,next}-desktop.png` |
| Catalog | `/catalog.html` | `/catalog` | `workstream-3-catalog-{legacy,next}-mobile.png` | `workstream-3-catalog-{legacy,next}-desktop.png` |
| Roadmap | `/prereqs.html` | `/roadmap` | `workstream-3-roadmap-{legacy,next}-mobile.png` | `workstream-3-roadmap-{legacy,next}-desktop.png` |
| Certifications | `/certifications.html` | `/certifications` | `workstream-3-certifications-{legacy,next}-mobile.png` | `workstream-3-certifications-{legacy,next}-desktop.png` |
| Certification track | `/certification.html?id=claude-ccao-f` | `/certifications/ccao-f` | `workstream-3-certification-track-{legacy,next}-mobile.png` | `workstream-3-certification-track-{legacy,next}-desktop.png` |
| CV Analysis presentation | `/cv-analysis.html` | `/cv-analysis` | `workstream-3-cv-analysis-{legacy,next}-mobile.png` | `workstream-3-cv-analysis-{legacy,next}-desktop.png` |

Each Next.js route passed the single-main/single-h1 landmark check, serious/critical axe gate, browser-console gate, and horizontal-overflow gate. Catalog and glossary search were exercised through their accessible names; legacy redirects and the certification `id` query compatibility route were also exercised.

## Material difference classification

| Surface | Classification | Review conclusion |
|---|---|---|
| Shared navigation | Intentional | The new shared shell uses the Workstream 2 responsive menu and fixture account controls. Primary public destinations remain keyboard reachable; legacy-only product destinations wait for their owning workstreams. |
| Academy hero | Intentional | The animated legacy diagram is re-composed as source-derived lesson and phase totals. The headline, learning/building/evidence hierarchy, calls to action, phase inventory, and attribution remain. |
| About, credits, assurance | Intentional styling only | Main content is loaded directly from each checked-in legacy HTML source and link targets are rewritten to canonical Next.js routes. Typography, cards, and spacing use the shared token system. No substantive section is removed. |
| Catalog | Intentional | The legacy table becomes responsive cards. All 503 generated lessons remain searchable and filterable by phase and language, with source lesson URLs retained. |
| Glossary | Intentional | The legacy ledger becomes a responsive definition grid. All 243 generated entries, aliases, categories, anchors, definitions, related terms, and search/filter behavior remain. |
| Roadmap | Intentional | The global-script dependency graph is re-expressed as deterministic phase cards and jump anchors using the same generated phase and prerequisite data. This removes the legacy mobile clipping visible in the paired fixture while keeping every phase and prerequisite inspectable. |
| Certifications | Intentional | Programme and track pages render directly from `program.json` and all four track manifests. The new layout foregrounds the current access notice and independent-curriculum boundary; exam facts, blueprint domains, audience, study plans, and canonical track URLs remain. |
| CV Analysis | Required boundary | Only the public presentation and privacy explanation are carried forward. Upload, account, storage, and provider controls are deliberately absent and replaced with an explicit local-preview boundary, as required by the runbook. |
| Mobile typography | Corrective improvement | The initial acceptance run found three long-heading overflows and one serious contrast finding. Responsive wrapping/sizing and the accessible accent token fixed them; the final run has no overflow or serious/critical axe finding. |

No material difference remains unexplained. The evidence is viewport-cropped rather than full-page so reviewers can compare the navigation, hero hierarchy, initial interaction surface, focus-scale controls, and first content transition at the exact required viewport dimensions.
