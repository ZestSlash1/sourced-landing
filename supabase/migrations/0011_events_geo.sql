-- Adds coarse geolocation to `events`, sourced from Vercel's edge geo headers
-- (x-vercel-ip-*) in middleware.ts — present in production on Vercel, absent
-- locally, so these columns are nullable and every reader must expect null.
-- Powers the "viewers by location" globe on /admin/analytics.

alter table events
  add column if not exists country text,
  add column if not exists city text,
  add column if not exists latitude double precision,
  add column if not exists longitude double precision;

create index if not exists events_geo_idx on events (latitude, longitude) where latitude is not null;
