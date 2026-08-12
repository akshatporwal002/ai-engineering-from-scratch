# Codeology visual baselines

These reference captures record the reviewed appearance of representative Codeology pages. They support human visual comparison while deterministic validators enforce markup, design-token, accessibility and viewport contracts.

## Homepage baseline

| Capture | Browser viewport request | Stored image | Theme | Reviewed contracts |
|---|---:|---:|---|---|
| `homepage-desktop-light.jpg` | 1440 × 1000 | 1430 × 993 | Light | Codeology hierarchy, three-column evidence loop, shared navigation, pure white canvas, no overflow |
| `homepage-mobile-dark.jpg` | 390 × 844 | 380 × 822 | Dark | Single-column evidence loop, compact header, pure black canvas, no overflow |

## Lesson reader baseline

| Capture | Browser viewport request | Stored image | Theme | Reviewed contracts |
|---|---:|---:|---|---|
| `lesson-desktop-light.jpg` | 1440 × 1000 | 1430 × 993 | Light | Imported lesson, pinned source badge, reader hierarchy, quiz content, sidebar and pure white canvas |
| `lesson-mobile-dark.jpg` | 390 × 844 | 380 × 822 | Dark | Wrapped source badge, mobile lesson drawer, quiz content, pure black canvas and no overflow |

## Glossary baseline

| Capture | Browser viewport request | Stored image | Theme | Reviewed contracts |
|---|---:|---:|---|---|
| `glossary-desktop-light.jpg` | 1440 × 1000 | 1430 × 993 | Light | Imported reference framing, editorial ledger, rounded bounded controls and pure white canvas |
| `glossary-mobile-dark.jpg` | 390 × 844 | 380 × 822 | Dark | Header clearance, stacked masthead/stats, search rail, mobile navigation and pure black canvas |

## Catalog baseline

| Capture | Browser viewport request | Stored image | Theme | Reviewed contracts |
|---|---:|---:|---|---|
| `catalog-desktop-light.jpg` | 1440 × 1000 | 1430 × 993 | Light | Imported pathway framing, filter controls, rounded table shell, current navigation and pure white canvas |
| `catalog-mobile-dark.jpg` | 390 × 844 | 380 × 822 | Dark | Header clearance, full-width controls, contained horizontal table scrolling and pure black canvas |

## Skill-map baseline

| Capture | Browser viewport request | Stored image | Theme | Reviewed contracts |
|---|---:|---:|---|---|
| `skill-map-desktop-light.jpg` | 1440 × 1000 | 1430 × 993 | Light | Imported pathway framing, explicit local-progress assurance, rounded editorial hero and pure white canvas |
| `skill-map-mobile-dark.jpg` | 390 × 844 | 380 × 822 | Dark | Header clearance, responsive hero/stats, assurance framing, no document overflow and pure black canvas |

The in-app browser reserves a small scrollbar/control gutter, so the stored JPEG dimensions are slightly smaller than the requested page viewport. The validator checks the immutable artifact dimensions shown above.

The browser review also confirmed:

- exactly one visible page heading;
- the inherited social-proof strip is not rendered;
- the mobile navigation exposes the five working routes and Codeology repository link;
- the current Academy route has `aria-current="page"`;
- keyboard focus has a two-pixel solid orange outline;
- inherited reduced-motion rules disable title, reveal, figure and progress animation.
- glossary search announces filtered result counts and preserves query state in the URL;
- the glossary mobile menu exposes the current route and reports its expanded state.
- catalog search/phase filters preserve URL state and sortable headers update `aria-sort`.
- the skill map retains 20 phases, keyboard route selection, URL-backed phase focus, bounded horizontal graph scrolling and text equivalents for progressive glow.

Refresh a capture only after the matching viewport has been manually reviewed. Run the matching page validator and `npm run ci` before committing the replacement.
