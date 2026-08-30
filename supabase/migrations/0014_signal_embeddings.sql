-- Embedding-based clustering (A2 rework): Jaccard word-overlap clustering
-- structurally can't detect cross-platform complaints — the same complaint
-- uses different vocabulary on HN vs Stack Exchange vs GitHub, so word-set
-- overlap stays near zero even when the underlying problem is identical.
-- Every non-singleton Jaccard cluster observed so far was single-platform.
--
-- Storing embeddings as jsonb rather than pgvector: this is a shared Supabase
-- instance and we don't want to install an extension on it for a 370-row
-- (and slowly growing) table. Pairwise cosine similarity in application code
-- is O(n^2) but fine at this scale — flag if the pool ever approaches 5000
-- signals, since that's where jsonb + in-process comparison stops being the
-- right call and pgvector becomes worth the ask.
alter table raw_signals add column if not exists embedding jsonb;

comment on column raw_signals.embedding is
  'openai/text-embedding-3-small vector (1536 floats) as a jsonb array, via OpenRouter. Null until the embedding backfill/pipeline step runs.';

-- Pipeline observability for the new embedding step.
alter table pipeline_runs add column if not exists embeddings_generated int not null default 0;
alter table pipeline_runs add column if not exists embedding_errors jsonb not null default '[]'::jsonb;
alter table pipeline_runs add column if not exists embedding_cost_usd real not null default 0;
