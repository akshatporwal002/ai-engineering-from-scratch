# FastAPI application rules

This directory contains Codeology's production-oriented FastAPI application.
The earlier in-memory-only experiment boundary has ended. Implement production
integrations according to `docs/NEXTJS_FASTAPI_COMPLETION_RUNBOOK.md`, while
retaining in-memory and fake adapters only as explicitly selected development
and test dependencies.

## Permitted integration scope

- Supabase Auth token verification and authenticated request context.
- Ownership-scoped Supabase PostgreSQL repositories, preserving database RLS.
- Private Supabase Storage adapters for CV documents.
- Supabase Vault or the existing secret-reference boundary for learner-owned
  provider credentials.
- Account, progress, provider/model, CV document, and CV analysis services.
- Configuration-selected provider adapters and validated model allowlists.
- Secure PDF, DOCX, and plain-text extraction for bounded hostile uploads.
- Deployment configuration, environment templates, health/readiness checks,
  and same-origin integration with the Next.js application.

Production integrations must remain behind the existing service, repository,
storage, and provider protocols. Do not embed Supabase or provider business
logic directly in route handlers.

## Security requirements

- Authenticate at the API boundary and authorize every sensitive operation
  server-side. Never trust a browser-supplied user ID for ownership.
- Preserve RLS as defence in depth. Repository queries and object paths must
  also be ownership-scoped.
- Treat filenames, file contents, MIME values, document parsers, prompts, and
  provider responses as hostile input. Enforce type, signature, size, page or
  character, path, timeout, and rate limits before expensive processing.
- Never log or expose request bodies, CV content, prompts, raw provider
  responses, credentials, cookies, authorization values, service keys, or Vault
  secret material. Return stable, safe error codes and request IDs.
- Never return a stored provider credential after connection. Expose only the
  minimum masked metadata needed by the account interface.
- Production must fail closed when required configuration is missing or
  invalid. It must never silently fall back to in-memory repositories, fake
  users, synthetic credentials, fake providers, or fixture analysis results.
- Keep development/test adapter selection explicit and impossible to enable
  accidentally in a production environment. Add tests for this boundary.
- Use synthetic accounts, documents, and credentials in automated and
  integration tests. Do not commit `.env` files, secrets, real CVs, personal
  data, provider payloads, or browser evidence containing them.
- Validate outbound provider destinations and model identifiers from a server
  allowlist. Do not permit user-controlled URLs or arbitrary outbound requests.
- Make mutation retries idempotent where duplicate uploads, analyses, or
  deletions could otherwise occur.
- Do not execute uploaded or learner-supplied code on the API host.

## External-state boundary

Repository code, tests, placeholder-only environment templates, and deployment
documentation may be implemented without additional approval. Access to an
existing non-production environment is permitted only when it is positively
identified as non-production and the user has authorised that access. Use only
synthetic data and clean it up when the test contract requires it.

Do not deploy, change production or test infrastructure, modify database/RLS,
Storage, Vault, OAuth, Vercel, DNS, or GitHub settings, use live credentials, or
access production user data without the explicit authorization required by the
root `AGENTS.md` and the completion runbook. Prepare and test additive,
reviewable migrations locally before requesting any external action.

Run `npm run dev:api`, `npm run test:api`, `npm run typecheck:migration`, and
the complete gates required by `docs/NEXTJS_FASTAPI_COMPLETION_RUNBOOK.md` from
the repository root.
