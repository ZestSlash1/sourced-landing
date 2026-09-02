-- pgvector migration Phase A (pgvector-migration-spec.md): the O(n^2) JS
-- cosine loop in clustering.ts was fine at the 370-row scale noted in
-- 0014_signal_embeddings.sql but is already visibly slow at ~400 signals
-- and won't scale past ~2K. Moves similarity into Postgres via pgvector +
-- HNSW so nearest-neighbour becomes an indexed lookup.
--
-- Non-breaking: adds embedding_vec alongside the existing embedding jsonb
-- column. Dual-write during the transition; embedding (jsonb) is dropped
-- only in migration 0024 once parity is verified.
--
-- No "with schema extensions" here: that's a Supabase-cloud convention for
-- their shared Postgres, and this instance is self-hosted without an
-- `extensions` schema. Installing into the default schema (whatever's first
-- on search_path, self-hosted = public) and referencing `vector` unqualified
-- everywhere below works on both.
create extension if not exists vector;

alter table public.raw_signals
  add column if not exists embedding_vec vector(1536);

comment on column public.raw_signals.embedding_vec is
  'Same openai/text-embedding-3-small vector as embedding (jsonb), stored as pgvector for indexed cosine search. Backfilled from embedding by scripts/backfill-embeddings-vec.ts; dual-written going forward by lib/ingest/embeddings.ts. See pgvector-migration-spec.md.';

-- No index yet — built in 0023 after backfill so the HNSW build is one-shot.

-- RPC functions (server-side casts + queries) rather than round-tripping
-- 1536-float vectors through supabase-js, which can't cleanly serialize the
-- pgvector wire format from a plain JS array/RPC payload.

-- Phase B: casts the existing jsonb embedding to vector for a batch of ids,
-- entirely server-side. Returns the ids actually updated so the caller can
-- reconcile batch counts without a second round trip.
create or replace function public.backfill_embedding_vec_batch(p_ids uuid[])
returns table(id uuid)
language sql
as $$
  update public.raw_signals
  set embedding_vec = (embedding::text)::vector
  where raw_signals.id = any(p_ids)
    and embedding is not null
    and embedding_vec is null
  returning raw_signals.id;
$$;

-- Dual-write path for freshly generated embeddings (Phases A-E): accepts the
-- vector's text literal ('[0.1, 0.2, ...]') since that round-trips through
-- supabase-js as a plain string argument.
create or replace function public.set_signal_embedding_vec(p_id uuid, p_vec text)
returns void
language sql
as $$
  update public.raw_signals
  set embedding_vec = p_vec::vector
  where raw_signals.id = p_id;
$$;

-- Phase D: top-k nearest neighbours by cosine similarity for one signal,
-- excluding itself. `<=>` is cosine DISTANCE; similarity = 1 - distance.
create or replace function public.find_signal_neighbors(p_signal_id uuid, p_k int default 20)
returns table(id uuid, cluster_key text, similarity float)
language sql
stable
as $$
  select
    r.id,
    r.cluster_key,
    1 - (r.embedding_vec <=> q.embedding_vec) as similarity
  from public.raw_signals r, (select embedding_vec from public.raw_signals where id = p_signal_id) q
  where r.id != p_signal_id
    and r.embedding_vec is not null
    and q.embedding_vec is not null
  order by r.embedding_vec <=> q.embedding_vec
  limit p_k;
$$;
