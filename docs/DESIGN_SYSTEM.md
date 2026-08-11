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

This foundation intentionally changes only the shared shell. Lesson rendering and imported masthead content remain intact until their dedicated visual-regression slice.
