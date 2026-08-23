# Skill Map visual parity and accessibility report

**Status:** visual-verified; independent human review remains outstanding

**Canonical production revision:** `main`, ETag `c55b6a3010ca43473a4e753ad8d511bb`

**Verified:** 2026-08-23 in Chromium and WebKit

## Scope

The Next Skill Map now renders the maintained `site/prereqs.html` main region,
complete stylesheet stack, curriculum graph data, and interaction runtime
through a route adapter. It preserves all 20 nodes, prerequisite and unlock
edges, zoom, pan, keyboard graph navigation, node selection, inspector state,
direct hash entry, back/forward history, phase finder, responsive stacking,
theme behavior, focus visibility, attribution, URLs, and the route-specific
footer.

The current Next Catalog design was deliberately left unchanged. No Catalog
component, route, stylesheet, state, reference, or route status was modified.

## Evidence sets

- Immutable production references:
  `../reference-production/<browser>/<viewport>/roadmap/`
- Actual Next candidates and ordinary diffs: `../candidate-next/` and
  `../diffs/`
- Accessibility-corrected legacy and Next graph footers and inspectors:
  `../accessibility-corrected/<browser>/<viewport>/roadmap/`
- Same-run pre-correction projections and exact accessibility diffs:
  `../accessibility-pre-correction-projection/` and
  `../accessibility-corrected-diffs/`

The production tree contains 412 images and 412 JSON sidecars. The 112 active
references cover seven states, two capture sizes, four viewports, and two
browsers: default light, default dark, selected node, inspector, zoomed, URL
hash entry, and responsive workspace. The other 300 production captures are
preserved timing-audit evidence from the original, settled, anchored, and first
synchronized capture passes; none was overwritten or deleted.

## Deterministic synchronization

The first interactive captures exposed a reference-timing defect rather than
an implementation mismatch. Production uses smooth scrolling, so screenshots
taken immediately after `scrollIntoView()` sampled different intermediate
header positions. The retained capture series documents that investigation.
The active states wait for fonts and stable graph/inspector layout, disable
smooth scrolling only in the capture harness, compute document-flow anchors,
apply the final scroll position twice across animation frames, and then require
the measured scroll position to settle. Application appearance and runtime
motion were not changed to accommodate the screenshots.

The Next global form reset also overrode maintained native roadmap controls.
A route-scoped compatibility seam restores the inherited browser font before
the later roadmap rules apply. This makes the maintained source cascade
identical without copying or redesigning controls.

## Accessibility correction

Axe found real light-theme contrast failures in both maintained legacy and
Next after animation and graph state had settled. They were not intersection,
reveal, or test-timing issues. The legend and graph hint rendered `#707070` on
`#ebebeb`, measuring 4.15:1, and the recommendation label rendered `#c43b00`
on `#f6e8e4`, measuring 4.42:1. Both are normal-size text below the WCAG AA
4.5:1 threshold.

The maintained roadmap stylesheet now gives only the three footer text nodes a
route-scoped light-theme `#696969` token, measuring 4.60:1, and the
recommendation label a `#c23a00` token, measuring 4.51:1. Dark theme continues
to use the existing tokens. Next loads the same maintained stylesheet, so
legacy and Next cannot diverge. No Axe rule, node, route, or region is excluded.

The separately labelled accessibility matrix contains 64 corrected component
captures, 64 same-run pre-correction projections, 64 diff images, and 64 JSON
classifications: two components on legacy and Next, two themes, four viewports,
and two browsers. All 35,464 changed antialiased text pixels occur in the
approved light-theme legend, hint, and recommendation-label rectangles; every
sidecar reports `outsideApprovedRegions: 0`. Every dark comparison is exact.

Canonical references remain immutable. Ordinary parity saves the real
corrected candidate, then compares an exact pre-correction color projection to
the production reference. The independent accessibility test proves that the
projection and visible corrected candidate differ only in the approved DOM
regions.

## Difference classification

- All WebKit viewport and full-page comparisons are exact after the approved
  accessibility projection.
- Chromium geometry and full-page output are exact. The responsive-workspace
  viewport can vary by one or two grayscale channel values on 17 rounded-edge
  samples; Pixelmatch classifies at most six pixels. A state-specific six-pixel
  cap at threshold zero is documented under section 5.3 of the parity spec.
  It does not apply to full-page captures, other states, WebKit, or any visible
  content region.
- Content, typography, spacing, graph geometry, focus, overflow, responsive
  behavior, and interaction state have no unexplained difference.
- The light legend/hint and recommendation-label colors are the only visible
  approved corrections.

## Validation

- Focused unit suite: 11/11 passed.
- Legacy/Next interaction, keyboard, history, pan, zoom, responsive, console,
  first-party request, and Axe matrix passed in Chromium and WebKit across
  normal and reduced motion, with zero serious/critical findings.
- Complete Skill Map visual matrix: 72/72 passed. This includes 56 canonical
  state/browser/viewport cases and 16 corrected-evidence cases.
- Catalog freeze regression: 8/8 Chromium/WebKit cases passed for landmarks,
  Axe, keyboard search, and mobile/desktop overflow.
- Full migration validation: 32/32 API tests and 25/25 unit tests passed. The
  browser suite passed 117/118; its sole unrelated WebKit lesson-fallback wait
  passed 1/1 on immediate isolation. All Skill Map and Catalog cases passed.
- Typecheck, the 21-route production build, route-parity validation, and the
  complete pre-commit gate passed.
- Root `npm run ci` stops at the pre-existing unrelated
  `TranslateWorkflowContractTest.test_commit_failure_never_reports_publish_success`
  failure (expected nonzero, observed zero), after all preceding checks pass.

## Remaining acceptance work

An independent human reviewer must inspect the paired evidence before the
Skill Map can become `reviewed`. Other route families remain active migration
work. Catalog legacy restyling is explicitly excluded by user preference.
