# Next.js and FastAPI deployment

## Architecture

- Vercel builds the repository root with `npm run build:web` and serves `apps/web/.next`.
- Keep the Vercel project Root Directory at the repository root. Install both root build tools and `apps/web` dependencies. The root build package pins the same Next.js version as the app so Vercel framework detection works before the nested build starts; `tests/unit/deployment.test.tsx` guards that contract. No shared project Root Directory change is required.
- The browser calls same-origin `/api/v1/*`. The Next.js route handler forwards those requests to `NEXT_API_ORIGIN` and includes only the bearer token, content metadata, and request ID.
- FastAPI runs from `apps/api/Dockerfile` on a regional container host. Supabase remains the managed Auth, PostgreSQL, private Storage, RLS, and Vault layer.

## Environments

| Runtime | Local | Preview/test | Production |
|---|---|---|---|
| Web | `apps/web/.env.example` | Vercel preview variables | Protected Vercel production variables |
| API mode | `memory` or local Supabase | `supabase` | `supabase` |
| API secrets | local uncommitted environment | host secret manager | protected host secret manager |
| Supabase | local CLI project | dedicated non-production project | existing production project |

The web runtime receives only `NEXT_API_ORIGIN`, `NEXT_PUBLIC_SUPABASE_URL`, and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. The API runtime receives the variables documented in `apps/api/.env.example`. The service-role value must never be configured in Vercel with a `NEXT_PUBLIC_` prefix.

## Preview preparation

1. Apply the existing reviewed migrations to a positively identified non-production Supabase project.
2. Enable the intended GitHub and Google OAuth providers and add the preview origin plus `/auth/callback` to the allowed redirect list.
3. Deploy `apps/api/Dockerfile` close to the Supabase region. Configure `CODEOLOGY_API_ENVIRONMENT=preview`, `CODEOLOGY_API_ADAPTER=supabase`, exact allowed origins, and the non-production Supabase values.
4. Apply `supabase/migrations/20260902090000_add_cv_analysis_idempotency.sql` to preview before exercising CV analysis retries.
5. Configure the Vercel preview variables and set `NEXT_API_ORIGIN` to the HTTPS API origin.
6. Run `npm run ci:all`, deploy a preview, then exercise health, sign-in, progress reconciliation, provider connection, TXT/PDF/DOCX extraction, analysis history, deletion, and two-user isolation.
7. Run Supabase security and performance advisors. Confirm the `cv-documents` bucket is private and no service-role value appears in browser assets or logs.

## Cutover

Before changing `learn.akshatporwal.dev`, record the current Vercel deployment ID and keep it promoted as the rollback candidate. Confirm that the new web deployment uses the same Supabase project and additive schema; do not copy or rewrite user rows. Add the production and callback origins, warm `/api/v1/readiness`, run smoke tests, and only then promote the reviewed Next.js deployment.

## Rollback

Re-promote the recorded legacy Vercel deployment and deny the new web origin at the FastAPI allowlist. Keep PostgreSQL, Storage, Vault, and uploaded CV data intact. Do not drop tables or objects during application rollback. Investigate and notify affected users before any separately approved retention or deletion operation.
