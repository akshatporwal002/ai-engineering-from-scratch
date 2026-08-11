# Codeology design-system foundation

Codeology preserves the imported academy's editorial and pixel character while placing it inside a distinct product shell.

## Sources of truth

- `site/codeology-config.json` owns product identity and imported-academy attribution.
- `site/codeology.css` owns Codeology design tokens and shell components.
- `site/codeology-shell.js` applies the shared wordmark and visible source strip to every page that uses the inherited `header.js`.
- `content-sources.yml` remains authoritative for source IDs, licences and baseline commits. CI rejects drift between it and the public shell.

## Foundation rules

- Use pure `#ffffff` and `#000000` canvases.
- Use the orange accent for emphasis, focus and meaningful progress state.
- Use editorial typography and pixel details as identity, not as a reason for sharp or cramped controls.
- Build new controls from the shared radius, glass, surface and shadow tokens.
- Never communicate skill or assurance state through glow or colour alone.
- Keep the academy source, author, licence and baseline visible and machine-validated.
- Respect reduced motion and reduced transparency preferences.

Imported lesson rendering, quizzes, figures, navigation and progress behavior remain intact. Codeology may adapt the reader shell and metadata through a tracked override, but it does not silently rewrite imported curriculum content.

## Homepage product contract

The homepage leads with Codeology's three-part promise: learn freely, build in the learner's own environment, and connect claims to inspectable evidence. The imported AI Engineering from Scratch curriculum appears as a featured free pathway and retains its project, author, licence and baseline attribution.

The shared navigation exposes only working routes. Scenario, submission and profile destinations enter navigation only when their corresponding product slices exist. Unsupported inherited social-proof and creator-marketing claims stay out of the visible Codeology surface.

Reference captures live under `docs/visual-baselines/`. They are review artifacts rather than brittle pixel-perfect test fixtures; deterministic checks validate their expected viewport dimensions while browser review covers layout, responsive behavior, theme, navigation and focus visibility.

## Lesson reader contract

Every imported lesson displays an in-context source badge before its rendered content. The badge identifies the upstream project, author and MIT licence and links to the lesson directory at the registry's immutable baseline commit. Query-string paths are restricted to `phases/` or `certifications/`, reject dot segments and are encoded segment by segment before entering the GitHub URL.

Lesson titles, descriptions, canonical URLs and active structured data identify Codeology while `isBasedOn` and `license` preserve upstream provenance. The shared shell reattaches the badge after language-driven rerenders. Desktop-light and mobile-dark captures verify that this additional context does not obscure the lesson, quiz or responsive navigation.

## Glossary contract

The imported glossary remains a reference ledger rather than becoming a generic card grid. Codeology owns its public metadata and footer, identifies it as part of AI Engineering Foundations, and preserves the complete term dataset, category and alphabet filters, URL-backed search, stable deep links, command palette and read-aloud controls.

Rounded geometry is limited to bounded statistics, inputs, filters, actions and expandable details. The fixed two-row Codeology header must clear the masthead at every viewport. Search result updates remain announced through the existing polite live region, and mobile navigation retains an explicit expanded state.
