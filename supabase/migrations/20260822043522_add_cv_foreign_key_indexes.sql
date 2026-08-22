create index if not exists ai_provider_credentials_user_idx
  on private.ai_provider_credentials (user_id);

create index if not exists cv_analyses_provider_connection_idx
  on public.cv_analyses (provider_connection_id);
