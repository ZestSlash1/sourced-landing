-- Quality pass (sourced-pipeline-quality-spec.md): a complaint-classification
-- + normalization stage between polling and embedding. Fixes the two
-- structural causes of the 385-clusters-from-394-signals result: no complaint
-- gate (launches/news/announcements were clustered alongside real complaints)
-- and embedding raw prose (same complaint reads as unrelated text across
-- platforms). Embedding now runs on problem_statement, not title+text.

alter table raw_signals add column if not exists classified_as_complaint boolean;
alter table raw_signals add column if not exists problem_statement text;
alter table raw_signals add column if not exists domain text;
alter table raw_signals add column if not exists classification_confidence real;
alter table raw_signals add column if not exists classified_at timestamptz;

comment on column raw_signals.classified_as_complaint is
  'Null until classified. True only if the signal expresses an unmet need/friction/workaround — see lib/ingest/classification.ts.';
comment on column raw_signals.problem_statement is
  'Normalized single-sentence restatement of the complaint, fixed grammatical shape. This is what gets embedded, not title+text. Null for non-complaints.';
comment on column raw_signals.domain is 'Coarse category from lib/topics.ts TOPICS, reused from the customer-facing feed taxonomy. Null for non-complaints.';
comment on column raw_signals.classification_confidence is 'Model self-reported confidence in classified_as_complaint, 0-1.';

create index if not exists raw_signals_unclassified_idx
  on raw_signals (fetched_at desc)
  where classified_as_complaint is null;

-- Observability (Part 3): the draft-pass run now includes a classification
-- stage and a cluster-size distribution, so a stalled singleton rate is
-- diagnosable without querying raw_signals by hand.
alter table pipeline_runs add column if not exists classified_complaint int not null default 0;
alter table pipeline_runs add column if not exists classified_non_complaint int not null default 0;
alter table pipeline_runs add column if not exists classification_errors jsonb not null default '[]'::jsonb;
alter table pipeline_runs add column if not exists classification_cost_usd real not null default 0;
alter table pipeline_runs add column if not exists cluster_size_distribution jsonb not null default '{}'::jsonb;
