# Overnight design mapping

## Sources inspected

- `site/style.css` for the legacy shell, focus, responsive, motion, and footer behavior.
- `site/codeology.css` for the Codeology product overlay and light/dark tokens.
- `site/auth.js` for the account-menu presentation and keyboard expectations.
- Legacy Academy, Catalog, Glossary, About, Credits, Assurance, pathway, and CV Analysis markup for recurring composition patterns.

## Token translation

| Legacy source | Next/Tailwind token | Value or behavior |
| --- | --- | --- |
| `--codeology-canvas` | `canvas` | white in light mode, black in dark mode |
| `--codeology-ink` | `ink` | near-black in light mode, warm white in dark mode |
| `--codeology-accent` | `accent` | burnt orange for controls, focus, and signals |
| `--codeology-display-accent` | `displayAccent` | brighter orange for display headings |
| `--codeology-surface` | `surface` | low-contrast editorial card fill |
| `--codeology-line` | `line` | theme-aware hairline border |
| `--codeology-radius-*` | `sm/md/lg/pill` | 10px, 16px, 24px, and pill |
| `--codeology-shadow-soft` | `soft` | restrained overlay elevation |
| VT323 / Source Serif 4 / JetBrains Mono | `display/body/mono` | display, reading, and interface roles |
| 700px, 900px, 1100px legacy adaptations | narrow and shell CSS gates | touch-first shell at 900px; dense content stacks below 620px |

## Preserved behavior

- White/black canvas, near-black/warm-white ink, and orange signal hierarchy.
- Pixel-display headings, serif reading text, and compact monospaced interface labels.
- Sticky translucent header, compact uppercase navigation, presentational account card, and editorial footer.
- Minimum 44px interactive targets, visible three-pixel focus rings, reduced-motion handling, and reduced-transparency fallback.
- Rounded surfaces are reserved for controls, cards, menus, and dialogs; editorial sections remain borderless with strong rules.

## Intentional deviations

- The new mobile menu switches at 900px instead of using several page-specific legacy breakpoints. This consolidates equivalent behavior while retaining the same touch-target and content-order contract.
- Native `select` is retained for robust platform keyboard and assistive-technology behavior; it is themed rather than replaced with a custom listbox.
- The fixture account menu does not authenticate or persist. It demonstrates the final visual and keyboard presentation only, as required by the overnight boundary.
- Showcase fonts use the declared legacy families with system fallbacks and make no external font request, keeping the experiment deterministic and offline.
