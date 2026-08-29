-- raw_signals: everything the source pollers (sourced-phase4-spec.md Part A1)
-- pull down, before any LLM spend. Cheap to write, cheap to requery — the
-- expensive step (draft generation) only ever reads from here.

create table if not exists raw_signals (
  id uuid primary key default gen_random_uuid(),
  source text not null check (source in ('reddit', 'hackernews', 'stackexchange', 'github')),
  url text not null,
  title text,
  text text not null,
  author text,
  engagement_metric int not null default 0,
  posted_at timestamptz,
  fetched_at timestamptz not null default now(),

  -- Set once a poller-run groups this signal with others describing the same
  -- underlying complaint (A2's clustering step). Signals sharing a
  -- cluster_key are drafted together in one Claude call.
  cluster_key text,

  -- Set once a cluster has been sent through draft generation (A3), so the
  -- clustering pass never re-drafts the same signals. References
  -- idea_drops.id once a draft exists; null before that.
  drafted_idea_id text references idea_drops(id) on delete set null,

  created_at timestamptz not null default now()
);

-- Dedup on url (A1): a poller re-fetching the same post/issue/question is a
-- no-op insert, not a duplicate row.
create unique index if not exists raw_signals_url_idx on raw_signals (url);

create index if not exists raw_signals_undrafted_idx
  on raw_signals (source, fetched_at desc)
  where drafted_idea_id is null;

create index if not exists raw_signals_cluster_key_idx on raw_signals (cluster_key);

alter table raw_signals enable row level security;
-- No public policies: only ever touched via the service-role client, same
-- convention as idea_drops and subscribers.
