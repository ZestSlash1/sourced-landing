-- Links subscribers to real Supabase Auth users (sourced-phase4-spec.md
-- Part B), and adds the topic-selection join table (B4).
--
-- subscribers rows are still keyed by email for the Razorpay follow-up
-- phase, but auth/tier lookups now go through user_id — see
-- lib/idea-drops/resolve-user-tier.ts.

alter table subscribers add column if not exists user_id uuid unique references auth.users(id) on delete set null;
create index if not exists subscribers_user_id_idx on subscribers (user_id);

create table if not exists subscriber_topics (
  subscriber_id uuid not null references subscribers(id) on delete cascade,
  topic text not null,
  created_at timestamptz not null default now(),
  primary key (subscriber_id, topic)
);

alter table subscriber_topics enable row level security;
-- No public policies: read/written only via the service-role client from
-- server-only code (lib/subscriptions/topics.ts), same convention as every
-- other table in this app.
