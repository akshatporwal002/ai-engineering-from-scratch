# Academy visual parity report

**Status:** Implemented; visual verification failed; human review not requested

**Canonical production revision:** `main`, ETag `c55b6a3010ca43473a4e753ad8d511bb`

**Captured:** 2026-08-23 in Chromium and WebKit

## Evidence matrix

The immutable baseline contains light and dark initial states at mobile,
tablet, desktop, and wide viewports in both required browsers. Each case has an
initial-viewport image, a full-page image, and a JSON sidecar. The normal visual
test generated 32 candidates and 32 heatmap diffs without modifying a reference.

- References: `../reference-production/<browser>/<viewport>/academy/`
- Candidates: `../candidate-next/<browser>/<viewport>/academy/`
- Diffs: `../diffs/<browser>/<viewport>/academy/`

## Difference classification

All 16 browser/theme/viewport cases fail the zero-tolerance pixel assertion.
The differences are material and blocking:

- **Structure and content:** the Next.js Academy omits substantial production
  sections and uses a different hero composition. Chromium mobile full-page
  height is 3,777px versus the 6,450px production reference.
- **Typography and geometry:** headline sizing, wrapping, content widths,
  navigation geometry, section rhythm, and footer placement differ.
- **Theme:** dark candidates differ across roughly 92–99% of compared pixels,
  indicating a page-wide palette/theme-state mismatch rather than harmless
  browser rasterization.
- **Responsive behavior:** all four viewports differ in both engines; the
  production mobile and tablet navigation/layout transitions are not restored.

No threshold was raised and no region was masked. Academy remains
`implemented`, not `visual-verified` or `reviewed`, until the shared shell and
Academy milestones remove these differences and interaction checks pass.
