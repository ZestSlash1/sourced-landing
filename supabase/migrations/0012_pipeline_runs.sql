-- pipeline_runs: one row per draft-pass invocation. Lets us see whether the
-- A2 clustering step is doing anything at all (previously it failed silently:
-- clusters were computed in memory, filtered by the 3+/2+ bar, and thrown
-- away without ever writing cluster_key to raw_signals).
create table if not exists pipeline_runs (
  id uuid primary key default gen_random_uuid(),
  ran_at timestamptz not null default now(),
  signals_considered int not null default 0,
  pairs_compared int not null default 0,
  clusters_formed int not null default 0,
  clusters_passing_bar int not null default 0,
  drafted int not null default 0,
  similarity_threshold real not null,
  min_cluster_size int not null,
  min_cluster_platforms int not null,
  errors jsonb not null default '[]'::jsonb
);

create index if not exists pipeline_runs_ran_at_idx on pipeline_runs (ran_at desc);

alter table pipeline_runs enable row level security;
-- Service-role only, same convention as raw_signals / idea_drops.
