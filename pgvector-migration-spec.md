# Sourced — pgvector Migration Spec

## Context

`raw_signals.embedding` is currently a `jsonb` column holding a 1536-dimension array
from OpenRouter's `text-embedding-3-small`. The clustering step fetches all signals
into Node, computes cosine similarity pairwise in JavaScript, and writes back a
`cluster_key`. This is O(n²) and already visibly slow at ~400 signals. It will not
scale past ~2K.

Migrating to `pgvector` moves similarity into Postgres with an HNSW index. Nearest
neighbours become an indexed lookup (`ORDER BY embedding <=> query LIMIT k`) instead
of a full table scan. Same math, several orders of magnitude faster, and clustering
logic becomes a single SQL query.

## Goal

Replace jsonb-backed embeddings with a real `vector(1536)` column, add an HNSW
index on cosine distance, and rewrite the clustering pass in SQL. Zero data loss.
Zero downtime for the pipeline. Keep pipeline_runs observability intact.

## Non-goals

- Changing the embedding model or dimensions
- Changing the 0.82 similarity threshold (do that in a separate experiment)
- Changing the 3-signals / 2-platforms publish bar

## Prerequisites

- Supabase project with database access (SQL editor is fine)
- Node/TS project already has `@supabase/supabase-js`
- Verify current row count: `select count(*) from raw_signals where embedding is not null;`
  (expect ~394; record the exact number for the acceptance check)

## Migration plan

### Phase A — Enable extension and add new column (non-breaking)

Run in Supabase SQL editor as one migration file `migrations/0018_pgvector_init.sql`:

```sql
-- Enable pgvector in the extensions schema (Supabase convention)
create extension if not exists vector with schema extensions;

-- Add the new column alongside the existing jsonb one
alter table public.raw_signals
  add column if not exists embedding_vec extensions.vector(1536);

-- No index yet — build it after backfill so the build is one-shot, not incremental
```

**Do not drop `embedding` (jsonb) yet.** We dual-write during transition.

### Phase B — Backfill from jsonb

Create `scripts/backfill-embeddings-vec.ts`:

```ts
// Fetches rows where embedding is not null and embedding_vec is null,
// casts the jsonb array to a vector string, writes it in batches of 500.
// Uses the service role key. Logs progress to console AND inserts a row
// into pipeline_runs with kind='backfill_embeddings_vec' at the end.
```

The write is a raw SQL update because supabase-js cannot round-trip vector types
through the JS client cleanly:

```sql
update raw_signals
set embedding_vec = (embedding::text)::extensions.vector
where id = $1;
```

Batch it (500 IDs at a time, sequential batches, catch and log per-row errors).
Run once. Expected runtime: seconds for 400 rows, minutes for 10K.

Add `--dry-run` flag that reports the count of rows that would be updated and
exits without writing.

### Phase C — Create HNSW index

After backfill completes, run `migrations/0019_pgvector_index.sql`:

```sql
create index if not exists raw_signals_embedding_vec_hnsw
  on public.raw_signals
  using hnsw (embedding_vec extensions.vector_cosine_ops)
  with (m = 16, ef_construction = 64);
```

`m=16, ef_construction=64` are the standard defaults and appropriate up to
~1M rows. Do not tune yet.

### Phase D — Rewrite the clustering pass

The current cluster function lives somewhere like `lib/pipeline/cluster.ts` (find
it by searching for the Jaccard-replacement code that computes cosine in JS). It
needs to become a SQL-driven pass.

New logic in `lib/pipeline/cluster.ts`:

```ts
// For each signal with embedding_vec and no cluster_key:
//   1. Find the k=20 nearest neighbours by cosine distance
//   2. Filter to neighbours where 1 - distance >= 0.82 (similarity threshold)
//   3. If ANY neighbour already has a cluster_key, assign this signal to that cluster
//      (pick the highest-similarity neighbour's cluster)
//   4. Else, mint a new cluster_key (uuid) and assign it
//   5. Write cluster_key back
//
// Do this iteratively over the unassigned pool until no signal is unassigned.
```

The nearest-neighbour query is one SQL call per signal:

```sql
select
  id,
  cluster_key,
  1 - (embedding_vec <=> $1::extensions.vector) as similarity
from raw_signals
where id != $2
  and embedding_vec is not null
order by embedding_vec <=> $1::extensions.vector
limit 20;
```

`<=>` is the cosine distance operator. `1 - distance` gives similarity in [0, 2]
range where 1.0 is identical, 0 is orthogonal. Threshold at 0.82 matches current
behaviour exactly.

Alternative single-query approach (faster but less transparent): use a recursive
CTE to build cluster components in one SQL round trip. Do NOT do this yet.
Keep the iterative per-signal loop for now — easier to observe and debug via
pipeline_runs. Optimise only if the pass takes more than 30s on 2K rows.

### Phase E — Verify parity

Before dropping the jsonb column, run a parity check script
`scripts/verify-embedding-parity.ts`:

- Pick 20 random signals with `cluster_key is not null`
- For each, run the OLD JS cosine similarity against every other signal
- Run the NEW SQL similarity for the same pairs
- Assert absolute difference < 0.0001 for every pair
- Report pass/fail and log to pipeline_runs

If parity holds, proceed. If not, STOP and investigate before Phase F.

### Phase F — Drop the old column

Only after Phase E passes and one full pipeline run completes cleanly on
`embedding_vec` alone. Migration `0020_drop_embedding_jsonb.sql`:

```sql
alter table public.raw_signals drop column embedding;
alter table public.raw_signals rename column embedding_vec to embedding;
```

Rename so downstream code doesn't need to change the column name permanently.

Update any code that still references the jsonb shape (search for
`.embedding[` and `JSON.parse` on embedding fields).

## Files to create or modify

Create:
- `migrations/0018_pgvector_init.sql`
- `migrations/0019_pgvector_index.sql`
- `migrations/0020_drop_embedding_jsonb.sql` (staged, don't run until Phase F)
- `scripts/backfill-embeddings-vec.ts`
- `scripts/verify-embedding-parity.ts`

Modify:
- `lib/pipeline/cluster.ts` (or wherever the JS cosine loop lives) — replace with
  the SQL nearest-neighbour approach described in Phase D
- `lib/pipeline/embed.ts` (or wherever new embeddings are written) — during
  Phases A–E, dual-write to both `embedding` (jsonb) AND `embedding_vec`. After
  Phase F, write to `embedding` only (which is now the vector column).
- `types/database.ts` or generated Supabase types — regenerate after Phase F

Do NOT modify:
- The embedding generation call to OpenRouter (same model, same dims)
- The 0.82 threshold constant
- The 3-signals / 2-platforms publish gate in `validateEvidence`
- The pipeline_runs schema

## Environment

No new env vars. pgvector runs inside Supabase.

## Acceptance criteria

- [ ] `create extension vector` succeeded and `select * from pg_extension where extname = 'vector'` returns a row
- [ ] `embedding_vec` column exists on `raw_signals` with type `vector(1536)`
- [ ] Backfill script processed the full row count with zero errors
- [ ] HNSW index `raw_signals_embedding_vec_hnsw` exists and `\d raw_signals` shows it
- [ ] Parity verification passed on 20 random signal pairs (< 0.0001 absolute delta)
- [ ] One full pipeline run completed on `embedding_vec`, cluster count is within ±5% of the pre-migration cluster count on the same signal pool
- [ ] Query `select id from raw_signals order by embedding_vec <=> (select embedding_vec from raw_signals limit 1) limit 5` returns in under 100ms
- [ ] Phase F migration applied, `embedding` column is now type vector, no code still references the old jsonb shape
- [ ] `pipeline_runs` has one row per phase logged with duration and row counts

## Rollback plan

Phases A–E are reversible without data loss because the jsonb column is untouched
until Phase F. To roll back:

```sql
drop index if exists raw_signals_embedding_vec_hnsw;
alter table raw_signals drop column embedding_vec;
drop extension if exists vector;
```

Rewrite `cluster.ts` to the pre-migration JS version (keep it in git history).

Phase F is one-way. Take a `pg_dump` of `raw_signals` before running 0020.

## Notes for the implementer

- pgvector's `<=>` is cosine DISTANCE not similarity. `similarity = 1 - distance`.
  Double check every threshold comparison.
- The vector literal syntax in raw SQL is `'[0.1, 0.2, ...]'::vector`, not
  `'{0.1, 0.2}'`. Use square brackets.
- supabase-js can send vectors as strings in RPC calls. The cleanest pattern is
  to write a Postgres function `find_similar_signals(query_vec vector, threshold float, k int)`
  and call it via `supabase.rpc()`.
- Do not use IVFFlat instead of HNSW. HNSW is better in every dimension for this
  data size range and needs no training step.
- If you see "operator does not exist: vector <=> vector" the extension is not
  in the search path. Either fully-qualify as `extensions.vector` or add
  `extensions` to the search path for the role.
