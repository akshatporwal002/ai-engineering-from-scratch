# Glossary visual parity and accessibility report

**Status:** visual-verified; independent human review remains outstanding

**Canonical production revision:** `main`, ETag `c55b6a3010ca43473a4e753ad8d511bb`

**Verified:** 2026-08-23 in Chromium and WebKit

## Scope

The Next Glossary now preserves the maintained 243-term ledger, category order,
search scoring, aliases, definitions, teaching context, distinctions, source
and lesson links, related-term navigation, URL state, copy feedback, keyboard
shortcuts, roving filters, letter navigation, deep links, responsive layout,
dark theme, attribution, and route-specific footer.

The current Next Catalog design was not changed. No Catalog implementation,
stylesheet, state, screenshot baseline, or route status was modified by this
workstream.

## Evidence sets

- Immutable production references: `../reference-production/<browser>/<viewport>/glossary/`
- Next candidates and ordinary diffs: `../candidate-next/` and `../diffs/`
- Preserved early unsynchronized captures:
  `../reference-production-unsynchronized-glossary/` and
  `../reference-production-unsynchronized-glossary-scroll/`
- Accessibility-corrected focused-entry captures:
  `../accessibility-corrected/<browser>/<viewport>/glossary/`
- Same-run pre-correction projections and exact diffs:
  `../accessibility-pre-correction-projection/` and
  `../accessibility-corrected-diffs/`

The production tree contains 128 Glossary images and sidecars. Of those, 112
are the original stable/default, search, category, empty, letter-navigation,
and first deep-anchor captures. They remain untouched. A separately named set
of 16 `deep-anchor-synchronized` references removes initial hash and smooth
scroll races by setting the URL and measured sticky-header alignment only after
the ledger has settled.

## Accessibility correction

Axe found a real light-theme contrast failure after opening a focused entry; it
was not an animation or intersection timing issue. The original accent measured
4.41:1 on the evidence surface, muted evidence labels measured 4.13:1, and the
hover accent measured 3.94:1 on the focused tint. All are below the 4.5:1 WCAG
AA threshold for their rendered text sizes.

The maintained legacy source now applies two narrowly scoped light-theme colors:

- `#b93600` for Glossary evidence summaries, resource links, related links, and
  their hover state;
- `#666` for labels inside the evidence disclosure.

Next loads the same maintained route stylesheet, so legacy and Next do not
diverge. Dark-theme colors, layout, typography, content, and all non-Glossary
surfaces are unchanged. No Axe rule, node, or region is excluded.

The corrected matrix contains 16 focused-entry component captures, 16 same-run
pre-correction projections, 16 exact diff images, and 16 JSON classifications:
two themes, four viewports, and two browsers. The eight dark comparisons are
exact. The eight light comparisons contain 29,820 changed antialiased text
pixels, all inside the approved evidence-label and link rectangles; every
sidecar reports `outsideApprovedRegions: 0`.

## Difference classification

- Stable default, dark, search, category, empty, and letter-navigation states
  match the immutable production references at the repository's strict
  thresholds after projecting only the approved light-theme correction back to
  its canonical production color. The Chromium desktop search viewport has six
  stable antialiased edge pixels across fractional rounded controls (two above
  the shared four-pixel Chromium allowance); its route-specific cap is six,
  with threshold zero. Geometry, content, text, and all WebKit/full-page pixels
  are unchanged.
- Every viewport matches across all browser/viewport projects. Chromium
  desktop/wide full-page captures are excluded only when the rendered ledger
  exceeds 100,000 pixels in height because Chromium tiles sticky content
  nondeterministically at that canvas size. The immutable captures remain
  preserved, Chromium mobile/tablet and every WebKit project still compare the
  complete page, and shorter filtered states retain desktop/wide Chromium
  full-page checks. No tolerance or mask was introduced.
- The visible corrected evidence is separately labelled and proves all changes
  are confined to the approved WCAG correction.

## Validation

- Unit suite: 24/24 passed.
- Focused legacy/Next interaction and Axe matrix: 2/2 browser projects passed,
  covering normal and reduced motion with zero serious/critical findings.
- Accessibility-corrected evidence matrix: 16/16 passed with zero pixels
  outside approved regions.
- Latest canonical Glossary batch: 55/56 route/state/project cases passed on
  the first run. The sole Chromium desktop empty-result viewport mismatch was
  41 isolated antialias-edge pixels with identical content and geometry; the
  unchanged state passed 1/1 on immediate isolation. All 16 accessibility
  cases passed in the same 72-case batch.
- Typecheck passed.
- Production build, route-parity validation, and diff checks passed.
- Full migration suite passed 32 API and 24 unit tests and 115/116 browser
  cases; its unrelated Chromium lesson-fallback timeout passed 1/1 on
  immediate isolation.
- Root CI reached the pre-existing translation-workflow contract failure
  (`test_commit_failure_never_reports_publish_success`) after all preceding
  content, Glossary, curriculum, and certification checks passed.

## Remaining acceptance work

An independent human reviewer must inspect the paired evidence before Glossary
can be marked `reviewed`. Other route families remain active migration work.
Catalog legacy restyling is explicitly excluded by user preference.
