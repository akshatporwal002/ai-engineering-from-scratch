alter table public.ai_provider_connections
  drop constraint ai_provider_connections_provider,
  drop constraint ai_provider_connections_key_hint,
  drop constraint ai_provider_connections_model;

alter table public.ai_provider_connections
  alter column display_name drop default,
  alter column model drop default,
  add constraint ai_provider_connections_provider check (provider in ('gemini', 'openai', 'anthropic')),
  add constraint ai_provider_connections_key_hint check (char_length(key_hint) = 8),
  add constraint ai_provider_connections_model check (model ~ '^[A-Za-z0-9._:-]{2,80}$');

alter table public.cv_analyses
  drop constraint cv_analyses_provider,
  drop constraint cv_analyses_model;

alter table public.cv_analyses
  add constraint cv_analyses_provider check (provider in ('gemini', 'openai', 'anthropic')),
  add constraint cv_analyses_model check (model ~ '^[A-Za-z0-9._:-]{2,80}$');
