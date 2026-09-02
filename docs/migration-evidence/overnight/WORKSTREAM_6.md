# Workstream 6 pure API evidence

Workstream 6 completed on 2026-08-23 without network access, persistent files, Supabase clients, real credentials, real CVs, or provider calls.

## Implemented contract

- Pydantic models cover progress, provider/model selection, safe connection metadata, CV intake and documents, analysis jobs/results, pagination, and the shared error envelope.
- Repository and service protocols are backed by ownership-scoped in-memory stores, a fixed clock, and sequential deterministic UUIDs.
- Python and TypeScript consume the same language-neutral progress fixtures. Latest timestamp wins; ties remain local; missing timestamps cannot erase newer state; repeated reconciliation is idempotent.
- CV intake accepts matching PDF, DOCX, TXT, and Markdown metadata, or exactly one pasted-text source. It enforces safe filenames, signatures, non-empty content, 120–100,000 readable characters, and the exact 10 MB boundary. The current DOCX error-code vocabulary remains part of the contract.
- Gemini, OpenAI, and Anthropic are closed allowlists. Fake adapters cover success, invalid key, quota, rate limit, unavailable, timeout, malformed response, and safety rejection without network I/O.
- The analysis state machine permits only `uploaded -> processing -> complete|failed`, stores safe failure codes, and returns the canonical five readiness dimensions and nine Career Architect signals.
- OpenAPI and the web TypeScript artifact are deterministic and guarded by drift tests.

## Validation

| Command | Result |
|---|---|
| `npm run test:api` | Passed, 30 tests |
| `npm run test:web` | Passed, 23 tests including two shared merge fixtures |
| `npm run check:precommit` | Passed |
| `npm run typecheck:migration` | Passed |
| `npm run build:migration` | Passed; 21 Next.js pages generated |

The first typecheck identified an invalid Python-style docstring in the TypeScript contract re-export; it was corrected to a TypeScript comment and both typecheck and build then passed. No test or gate was weakened.

## Security boundary

All credentials and CV text are synthetic test fixtures held in process memory only. Responses expose only credential hints. Provider/model selection is compiled and cannot construct an origin from user input. Safe-error and logging tests prove credentials, CV content, prompts, provider responses, authorization headers, and cookies do not reach responses or logs. Real authentication, extraction libraries, secret storage, object storage, provider HTTP adapters, database persistence, and deployments remain excluded.
