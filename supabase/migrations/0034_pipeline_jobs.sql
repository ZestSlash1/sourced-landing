-- Job queue that hands the draft pass from Vercel to the falcon worker
-- (scripts/pipeline-worker.ts). The draft pass needs local Ollama/OmniRoute,
-- which Vercel can't reach, so the admin banner and the draft-ideas cron
-- enqueue a row here and the worker on falcon claims and runs it.
create table if not exists pipeline_jobs (
  id uuid primary key default gen_random_uuid(),
  stage text not null check (stage in ('draft')),
  status text not null default 'queued' check (status in ('queued', 'running', 'done', 'error')),
  requested_by text, -- admin email, or 'cron'
  result jsonb,      -- DraftPassResult when status = 'done'
  error text,        -- message when status = 'error'
  created_at timestamptz not null default now(),
  started_at timestamptz,
  finished_at timestamptz
);

create index if not exists pipeline_jobs_status_created_idx on pipeline_jobs (status, created_at);

alter table pipeline_jobs enable row level security;
-- Service-role only, same convention as raw_signals / pipeline_runs.
