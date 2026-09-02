# Editorial visual parity and accessibility report

**Status:** About, Credits, and Assurance are visual-verified; human review remains outstanding

**Canonical production revision:** `main`, ETag `c55b6a3010ca43473a4e753ad8d511bb`

**Verified:** 2026-08-23 in Chromium and WebKit

## Evidence sets

- Immutable production: `../reference-production/<browser>/<viewport>/<route>/`
- Next candidate and ordinary diff: `../candidate-next/` and `../diffs/`
- Preserved invalid first capture: `../reference-production-unsynchronized-editorial/`
- Assurance pre-correction projection: `../accessibility-pre-correction-projection/<browser>/<viewport>/assurance/`
- Assurance corrected capture: `../accessibility-corrected/<browser>/<viewport>/assurance/`
- Assurance accessibility-only diff: `../accessibility-corrected-diffs/<browser>/<viewport>/assurance/`

The canonical editorial reference matrix contains 96 images and 96 JSON
sidecars: three routes, two themes, two capture sizes, four viewports, and two
browsers. Captures ran from 2026-08-23T08:51:23.380Z to
2026-08-23T08:52:21.351Z. The production build metadata was checked before and
after capture and did not change.

The first editorial capture completed before the asynchronous product shell had
settled on some pages. It is preserved, labelled as unsynchronized, and is not
used as a baseline. The capture helper now waits for the Codeology product
marker and wordmark. Existing Academy references were never touched.

## Implemented surface

- About, Credits, and Assurance render the maintained legacy HTML and complete
  stylesheet stack through a small Next route adapter.
- Main-region classes and direct-child relationships match the maintained
  source, preserving typography, spacing, lists, cards, responsive stacking,
  content, attribution, and route-specific footers.
- Shared skip links transfer focus to the main region in both the legacy shell
  and Next shell.
- The current Next Catalog design is explicitly preserved and was not restyled
  as part of this milestone.

## Accessibility correction

Axe found a real static Assurance failure in both browser engines; it was not
an animation or test-timing artifact. In the light theme, the hero heading was
2.86:1 against its rendered background, below the 3:1 large-text minimum. The
verified-state index and definition labels were 4.45:1 against their tint,
below the 4.5:1 normal-text minimum.

The smallest route-scoped corrections are shared by legacy and Next:

- Light-theme Assurance hero text uses `#f45118`, measured by the deterministic
  color calculation at 3.19:1 against the observed `#f5f5f5` background.
- Light-theme verified-state labels use `#bf3900`, measured at 4.66:1 against
  the observed `#f6e9e4` tint.
- Dark-theme colors and every other page color remain unchanged.

No Axe rule, node, route, or region is excluded. Focused legacy/Next checks in
normal and reduced motion report zero serious or critical findings in Chromium
and WebKit.

## Difference classification

About and Credits pass the production comparison across all required projects.
Raw RGBA inspection found 82 changed edge pixels across their 64 images: 61 on
About and 21 on Credits. They are isolated to identical fractional rounded
header controls. Pixelmatch reports at most four perceptual pixels in a
Chromium viewport; all full-page captures and all WebKit comparisons pass at
zero. Geometry, computed styles, text, and content are unchanged. The fixed
four-pixel cap applies only to Chromium viewport captures; no percentage
tolerance or mask is used.

The separately labelled Assurance accessibility matrix contains 32 corrected
images, 32 same-run pre-correction projections, 32 diff images, and 32 JSON
classifications. Sixteen dark-theme comparisons are exact. The sixteen
light-theme comparisons change 312,316 pixels: 309,080 in the large hero glyphs
and 3,236 in the three verified-state labels. Every sidecar reports
`outsideApprovedRegions: 0`. Focus correction is non-visual. The immutable
production references and preserved pre-correction candidates were not
overwritten.

## Validation

- Full ordinary and accessibility-corrected visual matrix: 64/64 passed,
  including the previously approved Academy corrections and all editorial
  routes in Chromium and WebKit.
- Focused legacy/Next keyboard, mouse, normal/reduced-motion, network, console,
  page-error, focus, and Axe matrix: 6/6 route/browser cases passed.
- Editorial landmark/Axe and mobile/desktop overflow matrix: 24/24 passed.
- Final `test:migration`: 32 API tests, 24 Vitest tests, and 114 Chromium/WebKit
  end-to-end tests passed.
- Final typecheck, 21-route production build, route-parity gate, and pre-commit
  gate passed. Root `npm run ci` remains red only at the pre-existing unrelated
  translate-workflow contract test recorded in the overnight handoff.

## Remaining acceptance work

An independent human reviewer must inspect the paired report before any route
is promoted from `visual-verified` to `reviewed`. The broader migration remains
active for the other unreviewed route families. Catalog legacy restyling is not
part of the remaining work because the current design is an explicit user
preference.
