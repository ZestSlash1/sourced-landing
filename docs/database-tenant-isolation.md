# Sourced Database Multi-Tenant Isolation Guide

## Context & The Mettel Shared Database Risk
Sourced currently shares a Supabase database instance (`https://sourced-db.getsourced.dev`) with the Mettel project. While all Sourced tables currently have Row-Level Security (RLS) enabled with zero public policies, operating in a shared `public` schema presents long-term risks:
1. Future migrations might omit `ALTER TABLE ... ENABLE ROW LEVEL SECURITY`, exposing rows to the anon key.
2. Table name collisions (such as the legacy `subscribers` table collision fixed in migration 0008).
3. PostgREST API schema exposure across projects.

## Architecture Roadmaps

### Phase 1: PostgreSQL Schema Separation (Zero Downtime)
Applied via `supabase/migrations/0031_tenant_schema_guardrails.sql`:
- Creates the dedicated `sourced` schema.
- Restricts all permissions on `sourced.*` to `postgres` and `service_role`.
- Completely revokes `anon` and `authenticated` access from the schema.
- All future Sourced tables are placed under `sourced.*`.

### Phase 2: Dedicated Standalone Supabase Project (Permanent Decoupling)
The recommended permanent production architecture is provisioning a dedicated Supabase project exclusively for Sourced.

#### Migration Steps:
1. **Create Sourced Supabase Project**:
   - Provision a new project on supabase.com or self-hosted cluster.
   - Note the new `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY`.

2. **Dump Sourced Tables Only (Never Dump Mettel Tables)**:
   ```bash
   pg_dump "$OLD_DATABASE_URL" \
     -t idea_drops \
     -t raw_signals \
     -t idea_drop_views \
     -t sourced_subscribers \
     -t subscriber_topics \
     -t events \
     -t admins \
     -t pipeline_runs \
     -t sourced_newsletter_signups \
     --data-only > sourced_data_export.sql
   ```

3. **Run Sourced Migrations on New Project**:
   - Apply migrations `0001` through `0031` sequentially on the new Supabase instance.
   - Restore data:
     ```bash
     psql "$NEW_DATABASE_URL" < sourced_data_export.sql
     ```

4. **Update Vercel & `.env.local`**:
   - Update `NEXT_PUBLIC_SUPABASE_URL`
   - Update `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - Update `SUPABASE_SERVICE_ROLE_KEY`
   - Redeploy Vercel production.

5. **Verify**:
   - Run `npm run audit:rls` against the new database to verify all tables remain locked down.
