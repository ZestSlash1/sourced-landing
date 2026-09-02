-- ollama-classification-spec.md: track the local/remote classifier provider
-- mix per pipeline run for the /admin/analytics provider-mix card, same
-- flat-column pattern as 0018's platform breakdown rather than a jsonb blob.
alter table pipeline_runs
  add column if not exists ollama_calls int not null default 0,
  add column if not exists openrouter_calls int not null default 0,
  add column if not exists ollama_avg_latency_ms numeric not null default 0,
  add column if not exists openrouter_avg_latency_ms numeric not null default 0,
  add column if not exists classifier_fallbacks int not null default 0,
  add column if not exists classifier_parse_failures int not null default 0;
