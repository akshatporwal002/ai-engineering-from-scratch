# Workstream 5 reference-lesson evidence

The acceptance run completed on 2026-08-23 with all 43 Chromium tests passing. The preferred reference source, `phases/01-math-foundations/08-optimization`, was used because it exercises the full reader surface: metadata, attribution, previous/next links, tables, 11 code blocks, five Mermaid definitions, the `gradient-descent` interactive figure, and a five-question quiz. No second lesson was migrated.

All browser traffic outside loopback was blocked. Legacy Markdown and quiz requests were fulfilled from the checked-in source files, then compared with `/lessons/01-math-foundations/08-optimization` at 390x844 and 1440x1000.

## Paired and interaction evidence

| State | Evidence |
|---|---|
| Mobile legacy/Next.js | `workstream-5-optimization-{legacy,next}-mobile.png` |
| Desktop legacy/Next.js | `workstream-5-optimization-{legacy,next}-desktop.png` |
| Interactive figure | `workstream-5-optimization-next-figure-desktop.png` |
| Completed quiz | `workstream-5-optimization-next-quiz-desktop.png` |

The Next.js route passed its landmark, heading, serious/critical axe, console-error, keyboard, and horizontal-overflow gates. Tests exercise TOC activation, all three figure controls, code copying, local quiz scoring, the legacy query redirect, missing lessons, and unavailable-figure fallback. Unit coverage additionally verifies exact source mechanisms, malformed-quiz paths, unavailable Mermaid rendering, quiz error state, scoring, and reset.

## Material difference classification

| Surface | Classification | Review conclusion |
|---|---|---|
| Reader navigation | Intentional | The shared shell and focused active-section TOC replace the full legacy phase sidebar because this slice migrates exactly one lesson. Every source heading and the source-derived previous/next destination remain available. |
| Markdown layout | Intentional styling only | Trusted checked-in Markdown is re-composed with shared tokens. The substantive prose, lists, tables, quotations, code, links, and hierarchy remain, with no observed clipping or mobile overflow. |
| Mermaid diagrams | Intentional constrained rendering | A deterministic local node-flow view replaces the legacy CDN Mermaid renderer because external traffic and an additional production dependency are outside this isolated slice. All five definitions remain represented and their complete Mermaid source is always keyboard-accessible; an explicit unavailable fallback is tested. |
| Interactive figure | Preserved with accessibility correction | The compatibility host serves the exact checked-in `site/lesson-figures.js` behavior locally. The wrapper adds accessible labels to the legacy range inputs and exposes a safe fallback when the script is unavailable. |
| Quiz state | Required boundary | Questions, answers, explanations, scoring, and reset are preserved in memory. Anonymous persistence and authenticated synchronization are intentionally excluded by the runbook. |
| Unmigrated neighbours | Required boundary | Previous/next links use the canonical source lesson URLs because migrating a second lesson is prohibited in this workstream. |

No material difference remains unexplained. The local Mermaid composition is the only notable fidelity constraint; complete source disclosure preserves diagram information while keeping the experiment deterministic and offline.
