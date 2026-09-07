# RLS Audit Checklist — Sourced tables (shared Supabase project)

Sourced shares one Supabase project with Mettel. That means the
single biggest risk isn't a fancy exploit — it's a table where RLS
is either **off**, or **on but with a policy that's too permissive**
(e.g. `USING (true)` left over from prototyping), letting one
product's API key read the other product's rows.

Run this checklist against every table before treating RLS as done.
Do it via the Supabase SQL editor or CLI, not just the dashboard
toggle — the toggle only tells you RLS is *on*, not that the
policies are *correct*.

## Step 1 — Confirm RLS is enabled on every table

```sql
select tablename, rowsecurity
from pg_tables
where schemaname = 'public'
  and tablename in (
    'idea_drops','raw_signals','idea_drop_views',
    'sourced_subscribers','subscriber_topics','events',
    'admins','settings','pipeline_runs'
  );
```

Every row should show `rowsecurity = true`. If any show `false`,
that table is fully open to anyone with the anon key — fix this
first, before anything else on this list.

## Step 2 — Read every policy on those tables

```sql
select tablename, policyname, cmd, qual, with_check
from pg_policies
where schemaname = 'public'
  and tablename in (
    'idea_drops','raw_signals','idea_drop_views',
    'sourced_subscribers','subscriber_topics','events',
    'admins','settings','pipeline_runs'
  );
```

For each policy, check:

- [ ] `qual` (the `USING` clause) is not just `true` — it should
      reference something that actually scopes the row (a tenant
      id, an owner id, an auth.uid() check, or — since Sourced and
      Mettel are different apps rather than different users of the
      same app — a service-role-only restriction).
- [ ] Write policies (`INSERT`/`UPDATE`/`DELETE`) have a
      `with_check` clause, not just a read-side `USING` clause.
      A table can look protected on SELECT and still be wide open
      on INSERT if `with_check` is missing.
- [ ] No policy exists that was clearly written for local testing
      and never removed (e.g. named `dev_bypass`, `temp_open`, or
      similar).

## Step 3 — Table-by-table pass

For each table, note: does it need to be reachable by the **anon
key** (public/browser) at all, or only by the **service role**
(server-side only)? Most of Sourced's tables should be
service-role-only.

| Table | Anon key needs access? | Notes to check |
|---|---|---|
| `idea_drops` | Read-only, public rows only (published + evidence-level fields) | Gated `build_brief` fields should not leak to anon on unpublished/ungated tiers |
| `raw_signals` | No — internal pipeline only | Confirm anon SELECT is blocked entirely |
| `idea_drop_views` | Write-only (view tracking) if used client-side | Confirm no SELECT/UPDATE/DELETE for anon |
| `sourced_subscribers` | No — auth'd user should only see their own row | Check `auth.uid()` scoping, not just "any authenticated user" |
| `subscriber_topics` | No — tied to subscriber ownership | Same as above |
| `events` | No — analytics, service-role only | Confirm not readable by anon |
| `admins` | No — never anon-reachable | This one leaking is the worst case; double-check |
| `settings` | No — service-role only | |
| `pipeline_runs` | No — internal observability | |

## Step 4 — Cross-tenant check (the Mettel-specific risk)

- [ ] Confirm Sourced's `NEXT_PUBLIC_SUPABASE_ANON_KEY` and any
      service-role key used in Sourced's server code cannot, even
      in principle, query Mettel's tables — either because RLS
      blocks it, or because these are genuinely separate
      Postgres roles with `GRANT`s scoped per-schema.
- [ ] If Sourced and Mettel tables live in the *same* `public`
      schema without a schema-level or role-level separation,
      treat this as the top-priority fix — the safest long-term
      answer is separate schemas (`sourced.*` / `mettel.*`) with
      per-schema roles, not just per-table RLS policies, since RLS
      alone depends on every future table being configured
      correctly by hand.

## Step 5 — Prove it, don't assume it

After fixing policies, actually test with the anon key (not the
service role) from a script or the Supabase CLI's local emulator:

```js
const { data, error } = await supabaseAnon
  .from('admins')
  .select('*');
// Expect: data === null or [], error present or empty result —
// NOT a list of admin rows.
```

Repeat for each sensitive table. A policy that "looks right" in
SQL but hasn't been tested against the actual anon key is not
verified.

## Cadence

Re-run this checklist whenever a new table is added, or before
adding any new product to the shared Supabase project.
