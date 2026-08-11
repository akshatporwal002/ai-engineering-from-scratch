# Codeology visual baselines

These reference captures record the reviewed appearance of representative Codeology pages. They support human visual comparison while deterministic validators enforce markup, design-token, accessibility and viewport contracts.

## Homepage baseline

| Capture | Browser viewport request | Stored image | Theme | Reviewed contracts |
|---|---:|---:|---|---|
| `homepage-desktop-light.jpg` | 1440 × 1000 | 1430 × 993 | Light | Codeology hierarchy, three-column evidence loop, shared navigation, source strip, pure white canvas, no overflow |
| `homepage-mobile-dark.jpg` | 390 × 844 | 380 × 822 | Dark | Single-column evidence loop, compact header, source attribution, pure black canvas, no overflow |

## Lesson reader baseline

| Capture | Browser viewport request | Stored image | Theme | Reviewed contracts |
|---|---:|---:|---|---|
| `lesson-desktop-light.jpg` | 1440 × 1000 | 1430 × 993 | Light | Imported lesson, pinned source badge, reader hierarchy, quiz content, sidebar and pure white canvas |
| `lesson-mobile-dark.jpg` | 390 × 844 | 380 × 822 | Dark | Wrapped source badge, mobile lesson drawer, quiz content, pure black canvas and no overflow |

The in-app browser reserves a small scrollbar/control gutter, so the stored JPEG dimensions are slightly smaller than the requested page viewport. The validator checks the immutable artifact dimensions shown above.

The browser review also confirmed:

- exactly one visible page heading;
- the inherited social-proof strip is not rendered;
- the mobile navigation exposes the five working routes and Codeology repository link;
- the current Academy route has `aria-current="page"`;
- keyboard focus has a two-pixel solid orange outline;
- inherited reduced-motion rules disable title, reveal, figure and progress animation.

Refresh a capture only after the matching viewport has been manually reviewed. Run the matching `check:home` or `check:lesson` command and `npm run ci` before committing the replacement.
