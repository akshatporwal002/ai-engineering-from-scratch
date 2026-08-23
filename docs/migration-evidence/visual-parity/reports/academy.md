# Academy visual parity and accessibility report

**Status:** Implemented; authorized accessibility correction verified; human visual review remains outstanding

**Canonical production revision:** `main`, ETag `c55b6a3010ca43473a4e753ad8d511bb`

**Verified:** 2026-08-23 in Chromium and WebKit

## Evidence sets

The original production reference and pre-correction Next candidate remain
unchanged. The authorized accessibility result has its own paired evidence:

- Immutable production: `../reference-production/<browser>/<viewport>/academy/`
- Preserved pre-correction Next candidate: `../candidate-next/<browser>/<viewport>/academy/`
- Same-run pre-correction projection: `../accessibility-pre-correction-projection/<browser>/<viewport>/academy/`
- Accessibility-corrected capture and JSON classification: `../accessibility-corrected/<browser>/<viewport>/academy/`
- Accessibility-only pixel diff: `../accessibility-corrected-diffs/<browser>/<viewport>/academy/`

The corrected matrix contains 32 captures: initial viewport and full page, in
light and dark themes, at mobile, tablet, desktop, and wide viewports, in both
required browsers. Each corrected capture has a sidecar linking all paired
artifacts and recording approved regions and changed-pixel counts.

## Implemented surface

- The production masthead, evidence loop, pathway content, statistics, phase
  table and dialog, books, certification spotlight, colophon, and attribution
  render from the maintained legacy source rather than a parallel copy.
- The Next adapter restores local progress, lesson links, dialog focus
  containment/restoration, Escape dismissal, copy feedback, reduced motion,
  and reveal behavior without accounts or external persistence.
- The complete legacy stylesheet stack and locally pinned typography are used
  by Next. The Catalog page and its current Next design were not changed.

## Accessibility diagnosis and corrections

The initial `.reveal` contrast report was a synchronization problem, not a
persistent contrast failure. In normal motion, Axe sampled the 2.4-second hero
title flicker/entrance state and reported the large heading at 2.73–2.90:1.
Waiting for the relevant Web Animations lifecycle to finish removed that
finding in Chromium and WebKit without changing animation CSS or appearance.
Reduced motion exposed no reveal-state failure. The accessibility helper now
waits for the relevant animation promises instead of using an arbitrary delay
or an Axe exclusion.

Three real static issues received the smallest shared-source corrections:

- The two `.books-note` links now have a persistent 1px underline with a
  restrained `0.2em` offset.
- The certification disclaimer mixes 2% of `--ink` into `--ink-mute`, moving
  its light-theme contrast from Axe's measured 4.42:1 above the 4.5:1 minimum.
- The maintained legacy phase overlay is inert while closed, matching the
  existing Next behavior and removing focusable descendants from its hidden
  state. This does not change appearance.

No WCAG rule, node, route, or region is excluded. Focused Axe checks report
zero serious or critical findings for both the legacy and Next Academy under
normal and reduced motion in Chromium and WebKit.

## Difference classification

The accessibility-only paired matrix changed 3,148 pixels across all 32
captures: 1,580 in Chromium and 1,568 in WebKit. All changes occur in full-page
captures; all 16 initial-viewport captures remain exact. Every changed pixel is
inside one of the two approved link rectangles. The two-step disclaimer color
change clears Axe but rounds to the same antialiased screenshot pixels at this
font size. The inert and test-synchronization corrections are non-visual.

`outsideApprovedRegions` is zero in every sidecar. The comparison uses
same-page before/after projections so previously classified cross-run browser
rasterization noise cannot be mistaken for an approved correction. No mask or
tolerance is used, and no canonical reference was overwritten.

The earlier production-to-candidate zero-tolerance matrix remains preserved:
eight cases were literal zero diff, while eight contained only 4–27 inspected
pixels on rounded borders, isolated glyph/figure edges, or WebKit's 12px
diagonal legend marker. Those artifacts remain historical parity evidence and
are not reclassified as accessibility corrections.

## Validation

- Focused legacy/Next Academy Axe and motion test: 4/4 passed.
- Accessibility-corrected visual matrix: 16/16 route/theme/project cases
  passed, producing 32 paired screenshots and 32 diff images.
- Final migration validation: 32 API tests, 23 unit tests, and all 108
  Chromium/WebKit end-to-end tests passed.
- Keyboard dialog behavior and local-only progress tests remain covered in
  `tests/e2e/public-routes.spec.ts`.

## Remaining acceptance work

- Capture and compare the still-required mobile-menu, initial animated frame,
  primary hover, and primary focus transient states.
- Obtain independent human review of the paired visual evidence.

The route must not be promoted to `visual-verified` or `reviewed` until those
remaining gates pass.
