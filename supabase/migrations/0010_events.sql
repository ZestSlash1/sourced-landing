-- events: generic analytics/events table backing /admin/analytics. Every row
-- is one tracked action (page view, signup, checkout, brief unlock, ...),
-- keyed to an anonymous `session_id` (the "sid" cookie, set in middleware)
-- and optionally a `user_id` once the visitor has signed in.

create table if not exists events (
  id uuid primary key default gen_random_uuid(),
  event_type text not null,
  session_id text not null,
  user_id uuid references auth.users(id) on delete set null,
  path text,
  referrer text,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create index if not exists events_event_type_idx on events (event_type);
create index if not exists events_created_at_idx on events (created_at);
create index if not exists events_user_id_idx on events (user_id);
create index if not exists events_session_id_idx on events (session_id);

alter table events enable row level security;
-- No public policies: same convention as every other table in this app —
-- access only via the service-role client from server-only code
-- (lib/track.ts), never directly from the browser.
