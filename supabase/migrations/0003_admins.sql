-- admins: allowlist of auth.users who may access admin routes. Sourced is a
-- solo-operator product (no team), so this is a single-row table keyed by
-- the one admin's auth user id rather than a role/permission system.
--
-- Create the admin user first (Supabase Dashboard -> Authentication -> Users
-- -> Add user, email/password), then insert their id here:
--   insert into admins (user_id) values ('<uuid from auth.users>');

create table if not exists admins (
  user_id uuid primary key references auth.users(id) on delete cascade
);

alter table admins enable row level security;
-- No public policies: this table is only ever read via the service-role
-- client in lib/auth/require-admin.ts, never from the browser.
