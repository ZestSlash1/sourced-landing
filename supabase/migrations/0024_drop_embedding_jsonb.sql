-- pgvector migration Phase F (pgvector-migration-spec.md) — STAGED, DO NOT
-- RUN until:
--   1. scripts/verify-embedding-parity.ts has passed
--   2. one full pipeline run has completed cleanly on embedding_vec alone
--   3. a pg_dump of raw_signals has been taken
-- This phase is one-way: the jsonb column is gone after this runs. Every
-- other phase in this migration is reversible without data loss (see
-- pgvector-migration-spec.md's Rollback plan) — this one is not.
alter table public.raw_signals drop column embedding;
alter table public.raw_signals rename column embedding_vec to embedding;

comment on column public.raw_signals.embedding is
  'openai/text-embedding-3-small vector (1536 dims), pgvector. HNSW-indexed (raw_signals_embedding_vec_hnsw). Was embedding_vec until the pgvector migration''s Phase F rename.';
