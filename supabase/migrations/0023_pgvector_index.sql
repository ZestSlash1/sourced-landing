-- pgvector migration Phase C (pgvector-migration-spec.md). Run only after
-- scripts/backfill-embeddings-vec.ts has completed, so the HNSW build is a
-- one-shot bulk build rather than incremental inserts.
--
-- m=16, ef_construction=64 are pgvector's stated defaults and appropriate
-- up to ~1M rows; do not tune yet.
create index if not exists raw_signals_embedding_vec_hnsw
  on public.raw_signals
  using hnsw (embedding_vec vector_cosine_ops)
  with (m = 16, ef_construction = 64);
