-- Make retried FastAPI analysis requests return the original saved analysis.
alter table public.cv_analyses
  add column if not exists idempotency_key text;

alter table public.cv_analyses
  drop constraint if exists cv_analyses_idempotency_key,
  add constraint cv_analyses_idempotency_key
    check (idempotency_key is null or idempotency_key ~ '^[A-Za-z0-9._:-]{8,128}$');

create unique index if not exists cv_analyses_user_document_idempotency_idx
  on public.cv_analyses (user_id, cv_document_id, idempotency_key)
  where idempotency_key is not null;
