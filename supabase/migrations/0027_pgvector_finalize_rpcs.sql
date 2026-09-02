-- pgvector migration Phase F follow-up (pgvector-migration-spec.md). Must run
-- in the SAME session/transaction batch as 0024_drop_embedding_jsonb.sql,
-- immediately after it: 0022's RPC functions all reference the column by its
-- pre-rename name `embedding_vec`, which 0024 renames to `embedding`. Until
-- this runs, find_signal_neighbors (production clustering) and
-- set_signal_embedding_vec (every embedding write) are broken.
drop function if exists public.backfill_embedding_vec_batch(uuid[]);

create or replace function public.set_signal_embedding_vec(p_id uuid, p_vec text)
returns void
language sql
as $$
  update public.raw_signals
  set embedding = p_vec::vector
  where raw_signals.id = p_id;
$$;

create or replace function public.find_signal_neighbors(p_signal_id uuid, p_k int default 20)
returns table(id uuid, cluster_key text, similarity float)
language sql
stable
as $$
  select
    r.id,
    r.cluster_key,
    1 - (r.embedding <=> q.embedding) as similarity
  from public.raw_signals r, (select embedding from public.raw_signals where id = p_signal_id) q
  where r.id != p_signal_id
    and r.embedding is not null
    and q.embedding is not null
  order by r.embedding <=> q.embedding
  limit p_k;
$$;
