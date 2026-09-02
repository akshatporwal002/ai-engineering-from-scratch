# Workstream 7 mock-product evidence

## Scope

The `/cv-analysis` experiment consumes the FastAPI application through the same-origin Next.js proxy. FastAPI owns provider connections, progress, documents, jobs, results, history, pagination, and deletion in process memory. React owns only transient view and form state.

The browser surface is enabled only in development. It identifies itself as `Local fixture · not production AI`, uses synthetic account and CV data, describes credentials as opaque fixtures, and warns that restarting the API clears all state.

## Automated evidence

- `npm run test:api` — 32 passed.
- `npm run test:web` — 23 passed.
- `npm run test:web:e2e` — 48 passed, including five mock-product tests.
- Success coverage: signed-out and fixture-authenticated states, provider connection, model update, progress reconciliation, upload, paste, pending/success announcements, five dimensions, nine Career Architect signals, strengths, gaps, recommendations, rewrites, lesson suggestions, history reopening, pagination, delete cancellation, and confirmed deletion.
- Failure coverage: invalid credential, quota, rate limit, unavailable provider, timeout, malformed response, and safety rejection. Empty and boundary validation remain covered at the API contract layer.
- Privacy gate: all eight concrete fixture credential values and the synthetic CV body are absent from screenshots and rendered post-analysis content. Tests block every non-loopback browser request.
- Accessibility gate: the important success state has no serious or critical axe findings; status changes use a polite live region; destructive actions use a labelled alert dialog; keyboard-accessible controls preserve native focus behavior.

## Paired screenshots

| Viewport/state | Legacy | Next.js |
|---|---|---|
| 390x844, initial | `workstream-7-cv-analysis-legacy-mobile.png` | `workstream-7-cv-analysis-next-mobile.png` |
| 1440x1000, initial | `workstream-7-cv-analysis-legacy-desktop.png` | `workstream-7-cv-analysis-next-desktop.png` |
| 1440x1000, completed mock result | Not applicable: the legacy route requires a production account/provider path | `workstream-7-cv-analysis-next-result-desktop.png` |

The browser test proves the Next.js document width never exceeds its viewport in both paired states. Manual inspection found no clipping, overlap, illegible contrast, broken header, generic unstyled surface, or mobile regression.

## Difference classification

| Difference | Classification | Rationale |
|---|---|---|
| The legacy production account gate is replaced by an operational synthetic learner state. | Intentional improvement | The runbook requires an end-to-end local product slice without real authentication or accounts. The signed-out state remains directly exercisable. |
| Provider and outcome controls expose deterministic fixture choices. | Intentional improvement | These controls make every provider failure reproducible and are excluded from ordinary production builds. They never accept or display a real secret. |
| Persistence language says process memory and reset-on-restart. | Intentional improvement | It prevents the fixture from impersonating a durable account. Browser refresh behavior is deliberate while the API process remains alive. |
| Binary file extraction is labelled as a local fake-adapter boundary. | Intentional improvement | PDF/DOCX parsing and real CV processing are explicitly excluded; the UI preserves the upload contract without pretending extraction is production-ready. |
| Result language describes communication evidence, not employability or verified skill. | Intentional improvement | The deterministic response cannot be mistaken for a real AI assessment. |
| Shared shell, serif editorial typography, monochrome panels, orange accents, borders, and spacing differ in exact geometry from the legacy page. | Parity | The migrated route uses the established Next.js component system while preserving Codeology's observed identity and responsive hierarchy. |

No material difference is classified as an unresolved regression.

## Security and privacy review

- No Supabase, database, object storage, external provider, deployment, real account, real CV, or remote request is used.
- The proxy forwards only allowlisted request/response headers.
- The API logs operational allowlist fields only; contract tests reject sensitive response and log leakage.
- Provider secrets influence only the deterministic fake outcome and are not returned by the API or shown in history.
- Uploaded/pasted fixture input is cleared after each analysis attempt and is never placed in screenshot filenames, reports, console output, or visible saved history.
