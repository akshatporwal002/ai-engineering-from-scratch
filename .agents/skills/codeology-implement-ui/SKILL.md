---
name: codeology-implement-ui
description: Design and implement Codeology pages, components, navigation, skill maps, evidence views, and responsive interactions while preserving the established pixel-editorial identity and accessibility. Use for any learner-facing or employer-facing web interface change.
---

# Codeology UI Implementation

Read [references/design-language.md](references/design-language.md) and inspect existing pages at the target viewport before editing.

1. Reuse existing tokens, layout rhythms, typography, navigation and interaction patterns where they fit.
2. Keep the base canvas pure white or pure black. Use warm neutral surfaces only as bounded panels when intentionally preserving the reference language.
3. Combine editorial hierarchy and pixel accents with rounded, translucent or softly elevated modern components.
4. Make progress and assurance states understandable without relying on glow or colour alone.
5. Preserve keyboard operation, focus visibility, semantic structure, contrast, reduced motion and responsive behavior.
6. Keep imported lesson rendering stable unless the task specifically changes it.
7. Test representative mobile and desktop viewports and capture visual evidence for material changes.
8. Run `npm run ci` before handoff.

Do not introduce a new design system for a single page. Do not make skill progression decorative when the underlying evidence state is absent.
