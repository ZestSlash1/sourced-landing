-- One-off cleanup: remove the owner's own visits from `events`, so
-- /admin/analytics and its globe reflect real visitors only.
--
-- NOT a migration — deliberately outside supabase/migrations/ so it never
-- runs automatically. Run it by hand, a step at a time, and read the output
-- of each step before running the next.
--
-- Going forward this is handled automatically by the opt-out cookie
-- (visit /api/track/opt-out once per browser) — see lib/analytics/exclusion.ts.
-- This file is only for rows recorded before that existed.
--
-- Why not just "delete where city = 'Kolkata'": Kolkata has ~15M people and
-- India is plausibly a real slice of this app's traffic. Deleting a whole
-- city would throw away genuine visitors along with the owner. The owner is
-- identified instead by session: `session_id` is a one-year cookie, so the
-- owner's own browser shows up as a handful of sessions with a lot of views
-- each, while real visitors are many sessions with a few views each.


-- ---------------------------------------------------------------------------
-- STEP 1 — Look before deleting. Which sessions is Kolkata traffic made of?
-- ---------------------------------------------------------------------------
-- Expect the owner's own browsers to sit at the top with view counts well
-- clear of the rest, and a first_seen going back to when the site went live.
select
  session_id,
  count(*)                          as views,
  count(distinct path)              as distinct_paths,
  min(created_at)                   as first_seen,
  max(created_at)                   as last_seen,
  count(*) filter (where user_id is not null) as views_while_signed_in
from events
where event_type = 'page_view'
  and city = 'Kolkata'
group by session_id
order by views desc;


-- ---------------------------------------------------------------------------
-- STEP 2 — Sanity-check the blast radius before committing to it.
-- ---------------------------------------------------------------------------
-- Paste the session ids you identified as yours from step 1.
select
  count(*)                     as rows_to_delete,
  count(distinct session_id)   as sessions,
  min(created_at)              as oldest,
  max(created_at)              as newest
from events
where session_id in (
  -- 'paste-session-id-here',
  -- 'paste-session-id-here'
);


-- ---------------------------------------------------------------------------
-- STEP 3 — Delete. Same id list as step 2.
-- ---------------------------------------------------------------------------
-- Wrapped in a transaction so you can ROLLBACK if the row count surprises
-- you. Change COMMIT to ROLLBACK to rehearse it first.
begin;

delete from events
where session_id in (
  -- 'paste-session-id-here',
  -- 'paste-session-id-here'
);

commit;


-- ---------------------------------------------------------------------------
-- STEP 4 (optional) — Confirm the globe is clean.
-- ---------------------------------------------------------------------------
-- The globe reads the last 24h of located page views. This should now show
-- only locations you recognise as real visitors.
select city, country, count(*) as views
from events
where event_type = 'page_view'
  and latitude is not null
  and created_at > now() - interval '24 hours'
group by city, country
order by views desc;
