# Next.js visual parity implementation plan

This plan executes `docs/NEXTJS_VISUAL_PARITY_SPEC.md`. The live production
site is the visual oracle; `site/` is the secondary implementation reference.
No route may claim accepted parity until a human reviewer marks it `reviewed`.

## Acceptance criteria

- Production references are captured explicitly in Chromium and WebKit at
  390×844, 768×1024, 1440×1000, and 1920×1080.
- Ordinary test commands never write under `reference-production/`.
- Every candidate image is pixel-compared with its immutable reference and a
  nonzero diff remains a failure pending inspection and classification.
- Mouse, keyboard, axe, focus, responsive, reduced-motion, URL-state, console,
  request-failure, hydration, and overflow checks cover each migrated surface.
- The route manifest cannot infer acceptance from a page file or from an agent's
  assertion. Only human-reviewed evidence may use `reviewed`.
- The required web, repository, route-parity, and CI commands pass, except for
  any precisely recorded pre-existing repository failure.

## Ordered milestones

1. Replace screenshot-only evidence with immutable production capture and real
   Chromium/WebKit pixel diffs. Strengthen route/state evidence contracts.
2. Restore the shared shell: header, complete navigation, command palette,
   theme, account presentation, mobile menu, footer, and global geometry.
3. Restore Academy, including deterministic animation and transient states.
4. Restore About, Credits, and Assurance.
5. Restore Catalogue and Glossary, including URL-driven states.
6. Restore the interactive Skill Map.
7. Restore Certifications and the representative certification track.
8. Restore the representative lesson reader and quiz states.
9. Restore the public CV Analysis page and all accessible mock-backed states.
10. Enforce complete state, interaction, accessibility, and visual gates.
11. Record reviewer-ready evidence and the final handoff.

Each milestone is validated narrowly and committed independently with the
Conventional Commit subject specified by the visual parity specification.

## Contracts and rollback

- Existing `site/`, curriculum inputs, generated-content contracts, URLs,
  attribution, and legacy redirects remain intact.
- The experimental apps remain beside the legacy application. No deployment,
  merge, auth cutover, provider call, or production data operation is allowed.
- Visual references are added only by the explicit capture command. Replacing
  them requires deleting the exact baseline directory in a separately reviewed
  action; the capture command itself refuses overwrite.
- Candidate and diff output is disposable and never authorizes a baseline
  change. A milestone can be reverted independently without touching production
  references from the first milestone.

## Known decisions and stopping boundaries

- Production authentication is disabled, so signed-in Account and CV states
  cannot currently be captured from production. They remain `planned` until an
  approved test account or faithful legacy reference is available; no visual
  appearance will be invented.
- Stop the affected surface if production changes during a capture session, a
  required asset/font/state is unavailable, user edits overlap the target, or a
  visible difference can pass only by weakening the threshold. Continue safe,
  independent surfaces.
- Human review is required for the final `reviewed` transition. The implementing
  agent will not self-approve exceptions or visual diffs.
