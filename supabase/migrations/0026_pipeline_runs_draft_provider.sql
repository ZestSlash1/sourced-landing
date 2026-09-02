-- omniroute-drafts-and-ollama-lockin-spec.md: track the local/remote
-- draft-generation provider mix per pipeline run, same flat-column pattern
-- as 0025's classifier provider mix rather than a jsonb blob.
alter table pipeline_runs
  add column if not exists omniroute_calls int not null default 0,
  add column if not exists draft_openrouter_calls int not null default 0,
  add column if not exists omniroute_avg_latency_ms numeric not null default 0,
  add column if not exists draft_openrouter_avg_latency_ms numeric not null default 0,
  add column if not exists draft_fallbacks int not null default 0;
