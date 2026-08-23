# Shared shell parity report

**Status:** Interaction-verified; visual verification blocked; human review not requested

**Canonical production revision:** `main`, ETag `c55b6a3010ca43473a4e753ad8d511bb`

**Verified:** 2026-08-23 in Chromium and WebKit

## Implemented surface

- Production navigation order, labels, active-route state, desktop geometry,
  compact/mobile menu, skip link, and footer link order.
- Light/dark initialization, system fallback, toggle behavior, persistence, and
  reduced-motion handling.
- Command palette keyboard shortcut, focus containment, query/results/empty
  states, keyboard selection, Escape dismissal, and trigger-focus restoration.
- Signed-out login dialog, focus containment/restoration, and an explicit
  unavailable-provider state. No account, provider, secret, or external auth
  state was used.
- Locally pinned production typography assets for deterministic rendering:
  VT323, Source Serif 4 regular/italic, and JetBrains Mono.

## Functional evidence

`tests/e2e/shared-shell.spec.ts` exercises the desktop and mobile shell in both
required engines. It asserts the production header dimensions and container
position, navigation content, persisted theme state, command-palette behavior,
login-dialog state, keyboard focus behavior, mobile navigation, skip-link
behavior, overflow, and serious/critical axe findings.

The wider cross-browser suite is serialized because its product tests share one
in-memory FastAPI repository. Serialization removes cross-worker mutation and
resource-contention races without reducing assertions or coverage.

The final production-bundle acceptance run passed 102/102 cases: 51 in
Chromium and 51 in WebKit. The test build enables the fixture workspace through
the explicit `CODEOLOGY_ENABLE_FIXTURES=1` flag; ordinary production builds keep
that workspace disabled.

## Difference classification

The Academy light desktop reference and candidate have identical 1,440px
viewport width and a 65px desktop header region. A raw comparison of those first
65 rows still reports 2,446 differing pixels out of 93,600 (2.613%). Geometry
assertions pass in Chromium and WebKit, so the remaining header-region delta is
classified as typography/control rasterization pending dedicated transient-state
references and independent review. It is not accepted as visual parity.

The full Academy route remains materially different because its body has not
yet been ported: the current Chromium desktop candidate is 2,280px high versus
the 4,290px production reference. That body difference blocks route-level
visual verification even though the shared shell interaction slice passes.

No threshold was raised, no region was masked, and no reference image was
overwritten. The shell remains `interaction-verified`, not `visual-verified` or
`reviewed`, until required transient production references are captured and all
zero-tolerance comparisons pass or every residual pixel difference receives
the independent classification required by the visual parity specification.
