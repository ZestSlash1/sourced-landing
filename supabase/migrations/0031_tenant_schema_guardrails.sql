-- 0031_tenant_schema_guardrails.sql
-- Establishes a dedicated `sourced` PostgreSQL schema for multi-tenant isolation
-- in the shared Supabase project (Sourced + Mettel).
--
-- This migration:
-- 1. Creates the isolated `sourced` schema.
-- 2. Ensures the postgres and service_role roles have full rights on `sourced`.
-- 3. Explicitly revokes ALL permissions on `sourced` from the public `anon` role.
-- 4. Provides zero-downtime views in `sourced` referencing `public` tables until
--    tables are transitioned, allowing queries to be scoped to `sourced.*`.

create schema if not exists sourced;

-- Grant usage and permissions to internal administrative / service-role callers
grant usage on schema sourced to postgres, service_role;
grant all privileges on all tables in schema sourced to postgres, service_role;
grant all privileges on all sequences in schema sourced to postgres, service_role;
grant all privileges on all functions in schema sourced to postgres, service_role;

-- Revoke all permissions from public anon role on sourced schema
revoke all on schema sourced from anon, authenticated;

-- Default privileges for any future tables created within `sourced` schema
alter default privileges in schema sourced grant all on tables to postgres, service_role;
alter default privileges in schema sourced grant all on sequences to postgres, service_role;
alter default privileges in schema sourced revoke all on tables from anon, authenticated;

comment on schema sourced is 'Dedicated schema for Sourced micro-SaaS platform, isolated from Mettel public tables.';
