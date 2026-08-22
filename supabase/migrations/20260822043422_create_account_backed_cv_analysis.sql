create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create table public.ai_provider_connections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  provider text not null,
  display_name text not null default 'Gemini',
  key_hint text not null,
  model text not null default 'gemini-3.6-flash',
  verified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ai_provider_connections_provider check (provider in ('gemini')),
  constraint ai_provider_connections_display_name check (char_length(display_name) between 1 and 80),
  constraint ai_provider_connections_key_hint check (key_hint ~ '^.{0,8}[A-Za-z0-9_-]{4}$'),
  constraint ai_provider_connections_model check (model ~ '^gemini-[A-Za-z0-9.-]{1,48}$'),
  unique (user_id, provider)
);

create table private.ai_provider_credentials (
  connection_id uuid primary key references public.ai_provider_connections(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  vault_secret_id uuid not null unique,
  created_at timestamptz not null default now(),
  unique (connection_id, user_id)
);

create table public.cv_documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  storage_path text not null,
  original_filename text not null,
  mime_type text not null,
  byte_size integer not null,
  content_sha256 text,
  source_kind text not null default 'upload',
  target_role text not null,
  job_description text not null default '',
  status text not null default 'uploaded',
  processing_error_code text,
  provider_consent_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint cv_documents_storage_path check (char_length(storage_path) between 10 and 768),
  constraint cv_documents_storage_owner check (split_part(storage_path, '/', 1) = user_id::text),
  constraint cv_documents_filename check (char_length(original_filename) between 1 and 255),
  constraint cv_documents_mime check (mime_type in (
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain',
    'text/markdown'
  )),
  constraint cv_documents_size check (byte_size between 1 and 10485760),
  constraint cv_documents_sha256 check (content_sha256 is null or content_sha256 ~ '^[0-9a-f]{64}$'),
  constraint cv_documents_source check (source_kind in ('upload', 'pasted')),
  constraint cv_documents_role check (char_length(target_role) between 2 and 120),
  constraint cv_documents_job_description check (char_length(job_description) <= 20000),
  constraint cv_documents_status check (status in ('uploaded', 'processing', 'complete', 'failed')),
  constraint cv_documents_error_code check (processing_error_code is null or processing_error_code ~ '^[a-z0-9_]{1,64}$'),
  unique (user_id, storage_path)
);

create table public.cv_analyses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  cv_document_id uuid not null references public.cv_documents(id) on delete cascade,
  provider_connection_id uuid references public.ai_provider_connections(id) on delete set null,
  provider text not null,
  model text not null,
  schema_version integer not null default 1,
  role_readiness_score integer not null,
  role_readiness_label text not null,
  analysis jsonb not null,
  provider_request_id text,
  created_at timestamptz not null default now(),
  constraint cv_analyses_provider check (provider in ('gemini')),
  constraint cv_analyses_model check (model ~ '^gemini-[A-Za-z0-9.-]{1,48}$'),
  constraint cv_analyses_schema check (schema_version = 1),
  constraint cv_analyses_score check (role_readiness_score between 0 and 100),
  constraint cv_analyses_label check (role_readiness_label in ('early', 'developing', 'competitive', 'strong')),
  constraint cv_analyses_object check (jsonb_typeof(analysis) = 'object'),
  constraint cv_analyses_size check (octet_length(analysis::text) <= 524288),
  unique (user_id, cv_document_id, id)
);

create index cv_documents_user_created_idx on public.cv_documents (user_id, created_at desc);
create index cv_analyses_document_created_idx on public.cv_analyses (cv_document_id, created_at desc);
create index cv_analyses_user_created_idx on public.cv_analyses (user_id, created_at desc);

create or replace function public.codeology_set_updated_at()
returns trigger
language plpgsql
set search_path = pg_catalog
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

revoke all on function public.codeology_set_updated_at() from public, anon, authenticated;

create trigger ai_provider_connections_updated_at
before update on public.ai_provider_connections
for each row execute function public.codeology_set_updated_at();

create trigger cv_documents_updated_at
before update on public.cv_documents
for each row execute function public.codeology_set_updated_at();

alter table public.ai_provider_connections enable row level security;
alter table public.cv_documents enable row level security;
alter table public.cv_analyses enable row level security;

revoke all on table public.ai_provider_connections from anon, authenticated;
revoke all on table public.cv_documents from anon, authenticated;
revoke all on table public.cv_analyses from anon, authenticated;
grant select on table public.ai_provider_connections to authenticated;
grant select, insert, update on table public.cv_documents to authenticated;
grant select, delete on table public.cv_analyses to authenticated;
grant select, insert, update, delete on table public.ai_provider_connections to service_role;
grant select, insert, update, delete on table public.cv_documents to service_role;
grant select, insert, update, delete on table public.cv_analyses to service_role;
grant usage on schema private to service_role;
grant select, insert, update, delete on table private.ai_provider_credentials to service_role;

create policy "Learners can read their provider connections"
on public.ai_provider_connections for select to authenticated
using ((select auth.uid()) = user_id);

create policy "Learners can read their CV documents"
on public.cv_documents for select to authenticated
using ((select auth.uid()) = user_id);

create policy "Learners can create their CV documents"
on public.cv_documents for insert to authenticated
with check ((select auth.uid()) = user_id);

create policy "Learners can update their CV documents"
on public.cv_documents for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "Learners can read their CV analyses"
on public.cv_analyses for select to authenticated
using ((select auth.uid()) = user_id);

create policy "Learners can delete their CV analyses"
on public.cv_analyses for delete to authenticated
using ((select auth.uid()) = user_id);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'cv-documents',
  'cv-documents',
  false,
  10485760,
  array[
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain',
    'text/markdown'
  ]
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "Learners can read their own CV files"
on storage.objects for select to authenticated
using (bucket_id = 'cv-documents' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "Learners can upload their own CV files"
on storage.objects for insert to authenticated
with check (bucket_id = 'cv-documents' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "Learners can delete their own CV files"
on storage.objects for delete to authenticated
using (bucket_id = 'cv-documents' and (storage.foldername(name))[1] = (select auth.uid())::text);

create or replace function public.codeology_store_provider_secret(
  p_user_id uuid,
  p_connection_id uuid,
  p_secret text
)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public, private, vault
as $$
declare
  secret_id uuid;
  existing_secret_id uuid;
begin
  if p_secret is null or char_length(p_secret) not between 20 and 256 then
    raise exception 'invalid provider credential';
  end if;
  if not exists (
    select 1 from public.ai_provider_connections
    where id = p_connection_id and user_id = p_user_id
  ) then
    raise exception 'provider connection does not belong to user';
  end if;

  select vault_secret_id into existing_secret_id
  from private.ai_provider_credentials
  where connection_id = p_connection_id and user_id = p_user_id;

  if existing_secret_id is not null then
    delete from vault.secrets where id = existing_secret_id;
  end if;

  select vault.create_secret(
    p_secret,
    'codeology-provider-' || p_connection_id::text,
    'Codeology user-supplied AI provider credential'
  ) into secret_id;

  insert into private.ai_provider_credentials (connection_id, user_id, vault_secret_id)
  values (p_connection_id, p_user_id, secret_id)
  on conflict (connection_id) do update set
    user_id = excluded.user_id,
    vault_secret_id = excluded.vault_secret_id,
    created_at = now();
  return secret_id;
end;
$$;

create or replace function public.codeology_read_provider_secret(
  p_user_id uuid,
  p_connection_id uuid
)
returns text
language sql
security definer
set search_path = pg_catalog, public, private, vault
as $$
  select decrypted_secret
  from vault.decrypted_secrets ds
  join private.ai_provider_credentials c on c.vault_secret_id = ds.id
  join public.ai_provider_connections p on p.id = c.connection_id and p.user_id = c.user_id
  where c.connection_id = p_connection_id and c.user_id = p_user_id;
$$;

create or replace function public.codeology_delete_provider_secret(
  p_user_id uuid,
  p_connection_id uuid
)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public, private, vault
as $$
declare
  secret_id uuid;
begin
  delete from private.ai_provider_credentials
  where connection_id = p_connection_id and user_id = p_user_id
  returning vault_secret_id into secret_id;
  if secret_id is not null then
    delete from vault.secrets where id = secret_id;
  end if;
end;
$$;

revoke all on function public.codeology_store_provider_secret(uuid, uuid, text) from public, anon, authenticated;
revoke all on function public.codeology_read_provider_secret(uuid, uuid) from public, anon, authenticated;
revoke all on function public.codeology_delete_provider_secret(uuid, uuid) from public, anon, authenticated;
grant execute on function public.codeology_store_provider_secret(uuid, uuid, text) to service_role;
grant execute on function public.codeology_read_provider_secret(uuid, uuid) to service_role;
grant execute on function public.codeology_delete_provider_secret(uuid, uuid) to service_role;
