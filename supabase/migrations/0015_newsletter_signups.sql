-- Sourced-only newsletter capture. This is deliberately separate from the
-- shared instance's legacy `subscribers` table and from paid subscribers.
create table if not exists sourced_newsletter_signups (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  source_path text not null,
  created_at timestamptz not null default now()
);

create index if not exists sourced_newsletter_signups_created_at_idx
  on sourced_newsletter_signups (created_at desc);

alter table sourced_newsletter_signups enable row level security;
-- No public policies: writes happen only through the server route using the
-- service-role client, consistent with Sourced's existing analytics tables.
