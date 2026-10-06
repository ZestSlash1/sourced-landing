-- sourced-clustering-upgrade-spec.md: tiered clustering funnel (candidate
-- discovery -> LLM arbiter -> existing 3+/1-platform gate). A dedicated table
-- rather than a column on raw_signals, since one signal can be a candidate
-- against several others.
create table if not exists candidate_pairs (
  id uuid primary key default gen_random_uuid(),
  signal_a_id uuid references raw_signals(id),
  signal_b_id uuid references raw_signals(id),
  cosine_score float not null,
  status text not null default 'pending', -- 'pending' | 'confirmed' | 'rejected'
  reviewed_at timestamptz,
  pipeline_run_id uuid references pipeline_runs(id),
  created_at timestamptz not null default now()
);

create index if not exists candidate_pairs_status_idx on candidate_pairs (status);
create index if not exists candidate_pairs_pipeline_run_id_idx on candidate_pairs (pipeline_run_id);

alter table candidate_pairs enable row level security;
-- Service-role only, same convention as raw_signals / pipeline_runs.

-- Funnel stage counts for the tiered clustering pass (candidates_found,
-- groups_after_arbitration, groups_confirmed_high_conf,
-- groups_confirmed_medium_conf, groups_passing_gate, llm_calls_made,
-- llm_cost_usd, borderline_groups, arbiter_errors). Null for any run that
-- didn't go through the tiered path (ENABLE_TIERED_CLUSTERING off).
alter table pipeline_runs add column if not exists funnel jsonb;
