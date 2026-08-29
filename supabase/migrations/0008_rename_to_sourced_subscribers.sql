-- Fixes a Phase 3 bug: `db.mettel.in` is a shared instance and already had
-- an unrelated `subscribers` table (a different project's newsletter
-- signup table — columns id/email/active/source/created_at). Migration
-- 0002's `create table if not exists subscribers` silently no-op'd against
-- it, so Sourced's real tier/status/Razorpay columns were never created;
-- 0006 then compounded this by adding a user_id column onto that same
-- unrelated table. This migration undoes that and creates Sourced's table
-- under a name that can't collide.

alter table subscribers drop column if exists user_id;

create table if not exists sourced_subscribers (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  user_id uuid unique references auth.users(id) on delete set null,
  razorpay_subscription_id text,
  tier text not null default 'free' check (tier in ('free', 'builder', 'studio')),
  status text not null default 'active' check (status in ('active', 'past_due', 'cancelled')),
  tier_renews_at timestamptz,
  grace_period_ends_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists sourced_subscribers_email_idx on sourced_subscribers (email);
create index if not exists sourced_subscribers_user_id_idx on sourced_subscribers (user_id);

alter table sourced_subscribers enable row level security;
-- No public policies: same convention as every other table in this app —
-- access only via the service-role client from server-only code.

drop trigger if exists sourced_subscribers_set_updated_at on sourced_subscribers;
create trigger sourced_subscribers_set_updated_at
  before update on sourced_subscribers
  for each row
  execute function set_updated_at();

-- subscriber_topics (0006) pointed at the wrong subscribers table and is
-- empty (topic-picker just shipped this session, nothing to preserve) —
-- recreated here pointing at sourced_subscribers instead of altering a
-- foreign key by its auto-generated name.
drop table if exists subscriber_topics;

create table subscriber_topics (
  subscriber_id uuid not null references sourced_subscribers(id) on delete cascade,
  topic text not null,
  created_at timestamptz not null default now(),
  primary key (subscriber_id, topic)
);

alter table subscriber_topics enable row level security;
