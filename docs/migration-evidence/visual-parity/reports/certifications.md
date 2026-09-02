# Certifications visual parity and accessibility report

**Status:** visual-verified; independent human review remains outstanding

**Canonical production revision:** `main`, ETag `c55b6a3010ca43473a4e753ad8d511bb`

**Verified:** 2026-08-23 in Chromium and WebKit

## Scope

The Next certification programme index and track route now render the
maintained `site/certifications.html` and `site/certification.html` source,
certification data, progress runtime, and stylesheet stack through an isolated
adapter. The implementation preserves all four tracks, the selected track's
nine lessons and two assessments, optional deep dives, progress state, clean
Next URLs, keyboard focus, themes, responsive layout, attribution, disclaimer,
and certification-specific footer order.

This work does not concern the main `/catalog` route. Its current Next design
was deliberately left unchanged; no Catalog component, stylesheet, state,
reference, or route status was modified.

## Evidence sets

- Immutable production references:
  `../reference-production/<browser>/<viewport>/certifications-synchronized-v2/`
  and `../reference-production/<browser>/<viewport>/certification-track/`
- Actual Next candidates and ordinary diffs: `../candidate-next/` and
  `../diffs/`
- Accessibility-corrected legacy and Next optional-extension text:
  `../accessibility-corrected/<browser>/<viewport>/certification-track/`
- Same-run pre-correction projections and exact correction diffs:
  `../accessibility-pre-correction-projection/` and
  `../accessibility-corrected-diffs/`

The active visual matrix contains 40 passing browser/viewport cases: 16 for
the programme index in light and dark themes, and 24 for the track's default
light, default dark, and deterministic 2-of-9 progress states. Both viewport
and full-page captures are retained for every active case.

## Deterministic synchronization

The first programme-index production capture set is preserved under the
original `certifications` identifier. It exposed browser-cache-dependent lazy
loading of the remote credential badge: some captures contained the badge and
some sampled its initial empty state. Those references were not overwritten.
The separately labelled `certifications-synchronized-v2` fixture replaces only
that image source with a transparent in-memory data image after page readiness
on both production and Next during screenshot capture. The application still
loads the maintained badge normally; no user-visible runtime behavior changed.

The track comparison projects the prior production orange only while comparing
light-theme screenshots, keeping the immutable reference authoritative while
the real candidate shows the approved accessibility correction. WebKit and all
full-page comparisons are exact. Chromium viewport projections repaint 25–28
antialiased pixels in the unchanged header search glyph, within a state-local
32-pixel zero-threshold cap; the full-page image remains exact and no content,
geometry, focus, overflow, or responsive difference is concealed.

## Accessibility correction

Axe was run after fonts, data rendering, and motion state had settled. The
optional-extension badge and book-note link still rendered `#c43b00` on the
blended light background at approximately 3.70:1, so the failure was static,
not an animation, reveal, intersection, or test-timing defect.

The maintained certification stylesheet now uses `#a73b00` for those two
light-theme text roles, measuring 4.51:1. Dark theme retains the original
blueprint token. Next consumes the same stylesheet, so maintained legacy and
Next cannot diverge. No Axe exclusion, WCAG exception, mask, or broad visual
restyle was added.

Separately labelled component evidence covers the badge and book-note link on
legacy and Next in all eight browser/viewport projects. Every current sidecar
reports `outsideApprovedRegions: 0`. Earlier successful whole-section evidence
is retained for the six non-mobile projects; the element-level matrix adds
deterministic mobile coverage without changing the canonical production tree.

## Difference classification

- The optional badge/link light-theme ink is the only approved visible
  correction.
- The synchronized transparent remote-badge state is a capture-only fixture,
  not an implementation difference.
- The Chromium header-glyph samples are projection-induced antialiasing; their
  exact full-page counterparts and all WebKit comparisons pass.
- Content, spacing, typography, progress, keyboard focus, links, overflow,
  responsive behavior, and dark theme have no unexplained deterioration.

## Validation

- Certification unit tests: 12/12 passed.
- Legacy/Next functional, keyboard, responsive, progress, console/network,
  and Axe checks passed in Chromium and WebKit under normal and reduced motion,
  with zero serious or critical findings.
- Complete active certification visual matrix: 40/40 passed across both
  engines and all four viewports.
- Accessibility-corrected element evidence: 8/8 project cases passed, with
  changed pixels confined to the explicitly approved element bounds.
- Full migration validation passed 32/32 API tests and 26/26 unit tests. The
  browser run passed 119/120; its sole unrelated WebKit Skill Map speculative
  prefetch console error passed 1/1 on immediate isolation. Every certification
  and Catalog case passed.
- Typecheck, the 21-route production build, route-parity validation, and the
  complete pre-commit gate passed.
- Root `npm run ci` stopped only at the pre-existing unrelated
  `TranslateWorkflowContractTest.test_commit_failure_never_reports_publish_success`
  failure (expected nonzero, observed zero), after all preceding checks passed.

## Remaining acceptance work

An independent human reviewer must inspect the paired evidence before either
certification route becomes `reviewed`. Certification lesson and assessment
destination surfaces retain their own route-family acceptance work. Main
Catalog legacy restyling remains explicitly excluded by user preference.
