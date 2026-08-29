-- idea_drop_views: tracks the first time a subscriber unlocks the full
-- content of an idea drop, so the monthly quota (Free 1/mo, Builder 4/mo,
-- Studio unlimited) can be enforced by counting rows per subscriber per
-- calendar month. Revisiting an idea already unlocked never counts twice,
-- since the natural key (subscriber_id, idea_id) is the primary key.

create table if not exists idea_drop_views (
  subscriber_id uuid not null references sourced_subscribers(id) on delete cascade,
  idea_id text not null references idea_drops(id) on delete cascade,
  viewed_at timestamptz not null default now(),
  primary key (subscriber_id, idea_id)
);

create index if not exists idea_drop_views_subscriber_viewed_at_idx
  on idea_drop_views (subscriber_id, viewed_at);

alter table idea_drop_views enable row level security;
-- No public policies: same convention as every other table in this app —
-- access only via the service-role client from server-only code.
