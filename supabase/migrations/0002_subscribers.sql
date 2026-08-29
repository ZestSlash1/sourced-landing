-- subscribers: one row per paying/free user, keyed by email until real
-- session auth exists (see lib/idea-drops/resolve-user-tier.ts). Nothing in
-- the app writes to this table yet — Razorpay wiring (sourced-phase2-spec.md
-- Phase 3) is what will start populating it.

create table if not exists subscribers (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  razorpay_subscription_id text,
  tier text not null default 'free' check (tier in ('free', 'builder', 'studio')),
  status text not null default 'active' check (status in ('active', 'past_due', 'cancelled')),
  tier_renews_at timestamptz,
  grace_period_ends_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists subscribers_email_idx on subscribers (email);

-- Same convention as idea_drops: RLS enabled, no policies. All access goes
-- through the service-role client from server-only code.
alter table subscribers enable row level security;

drop trigger if exists subscribers_set_updated_at on subscribers;
create trigger subscribers_set_updated_at
  before update on subscribers
  for each row
  execute function set_updated_at();
