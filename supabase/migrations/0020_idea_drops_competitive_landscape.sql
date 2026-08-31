-- Competitive gap check (sourced-competitive-gap-spec.md): one real, logged
-- web search per drafted cluster, grounding a "does this already exist"
-- verdict in actual search citations rather than an LLM guessing from
-- training-data memory. See lib/ingest/competitive-landscape.ts.

alter table idea_drops add column if not exists competitive_landscape jsonb;

comment on column idea_drops.competitive_landscape is
  'Nullable. { verdict, existingSolutions[], checkedAt, searchQueryUsed } — see CompetitiveLandscape in types/idea-drop.ts. Null means no check has run yet or the check failed; never a fabricated fallback.';

alter table pipeline_runs add column if not exists competitive_checks_run int not null default 0;
alter table pipeline_runs add column if not exists competitive_check_errors jsonb not null default '[]'::jsonb;
alter table pipeline_runs add column if not exists competitive_check_cost_usd real not null default 0;
