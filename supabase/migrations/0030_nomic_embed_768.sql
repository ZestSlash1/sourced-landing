-- Switch raw_signals.embedding from vector(1536) (OpenRouter openai/text-embedding-3-small)
-- to vector(768) for local Ollama (nomic-embed-text).
-- Clears legacy 1536-dim vectors via USING NULL so they can be freshly backfilled
-- with uniform 768-dim vectors locally at $0 cost.

alter table public.raw_signals
  alter column embedding type vector(768) using null;

comment on column public.raw_signals.embedding is
  'nomic-embed-text vector (768 dims) via local Ollama. HNSW-indexed (raw_signals_embedding_hnsw).';

drop index if exists public.raw_signals_embedding_hnsw;

create index if not exists raw_signals_embedding_hnsw
  on public.raw_signals
  using hnsw (embedding vector_cosine_ops)
  with (m = 16, ef_construction = 64);

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
