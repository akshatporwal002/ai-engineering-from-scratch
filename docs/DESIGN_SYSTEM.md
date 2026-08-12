# Codeology design-system foundation

Codeology preserves the imported academy's editorial and pixel character while placing it inside a distinct product shell.

## Sources of truth

- `site/codeology-config.json` owns product identity and imported-academy attribution.
- `site/codeology.css` owns Codeology design tokens and shell components.
- `site/codeology-shell.js` applies the shared wordmark, navigation and footer Credits link to every page that uses the inherited `header.js`.
- `content-sources.yml` remains authoritative for source IDs, licences and baseline commits. CI rejects drift between it and the public shell.

## Foundation rules

- Use pure `#ffffff` and `#000000` canvases.
- Use the orange accent for emphasis, focus and meaningful progress state.
- Use editorial typography and pixel details as identity, not as a reason for sharp or cramped controls.
- Build new controls from the shared radius, glass, surface and shadow tokens.
- Never communicate skill or assurance state through glow or colour alone.
- Keep academy source, author, licence and baseline details on the dedicated Credits page and machine-validated against the registry.
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

## Catalog contract

The imported AI Engineering Foundations catalog remains a generated, sortable ledger of every free lesson. Codeology owns its metadata and public framing while preserving search, phase/status filters, URL state, keyboard-sortable columns and lesson links derived from trusted curriculum data.

Inputs and the scrollable table shell use shared rounded geometry and surface elevation. On mobile, every control spans the available width while the table remains intentionally horizontally scrollable inside its bounded container. The page and table must never expand the document viewport.

## Learning-map contract

The imported 20-phase prerequisite graph is the visual foundation for Codeology's future evidence-backed skill graph. During the academy stage it represents only free curriculum navigation and browser-local lesson activity. The interface must explicitly say that this state is not assessed, demonstrated or verified skill evidence.

Local lesson progress may increase node glow, but status text, lesson counts and stroke patterns must communicate the same state without colour, animation or visual effects. The 20-phase DAG, route highlighting, inspector, URL state, keyboard navigation, panning, zoom and source links remain imported behavior. Rounded graph nodes and softly elevated containers adapt that behavior to Codeology without changing the curriculum graph.

## About-page contract

The About route explains Codeology's learn/build/prove proposition, open-tool policy and evidence boundary. It must not repeat inherited upstream creator, hosting, commercial or endorsement claims as though they describe Codeology.

The imported academy receives a concise summary and a direct link to the dedicated Credits page. Product principles use editorial hierarchy, rounded bounded panels and accessible pill actions on the shared pure white/black canvas.

## Credits-page contract

The Credits route is the single persistent home for project authorship, licence, original repository, immutable imported baseline and non-endorsement details. Its values must remain aligned with `site/codeology-config.json` and `content-sources.yml`; CI rejects drift.

The shared footer links to Credits from every academy route. Imported lessons retain their contextual pinned-source badge, while the former global attribution strip must not return. The page uses the same editorial hierarchy, rounded ledgers and pure white/black canvas as the rest of Codeology.

## Assurance-page contract

The public assurance guide is a rendered companion to `content/codeology/policies/assessment-charter.v1.json`. Its learned, practised, demonstrated and verified definitions and rubric anchors must remain textually aligned with the machine-readable policy.

Evidence states use labels, evidence descriptions, assurance ceilings, borders and patterns; colour and emphasis are supplementary. The page must display the currently available claim ceiling, open-tool policy, non-claims, independent artifact/identity/administration axes and deterministic policy-engine boundary. No private grader prompt, hidden fixture, calibration answer or escalation threshold belongs on this page or under `content/codeology/`.
