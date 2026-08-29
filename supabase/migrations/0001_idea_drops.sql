-- idea_drops: one row per idea drop, matching types/idea-drop.ts.
--
-- Filterable/listable fields are real columns; the rich nested content
-- (problem, buildBrief, matchedApis, launchStack, agentPrompts, difficulty,
-- evidence) is jsonb, since it's read as a whole block and never queried
-- field-by-field from SQL.
--
-- Run this once in the Supabase SQL editor (Project -> SQL Editor -> New query)
-- before the app/api/ideas routes will work.

create table if not exists idea_drops (
  id text primary key,                    -- "sourced-2026-08-29-001"
  slug text unique not null,
  title text not null,
  category text not null,
  demand_score int not null check (demand_score between 0 and 100),
  tags text[] not null default '{}',
  published_at date not null,
  tier text not null check (tier in ('free', 'builder', 'studio')),

  problem jsonb not null,                 -- { summary, whoFeelsIt }
  evidence jsonb not null default '[]',   -- Evidence[]
  why_now text not null,
  build_brief jsonb not null,             -- { coreLoop, mvpScope, explicitlyCut, dataModel }
  matched_apis jsonb not null default '[]',
  launch_stack jsonb not null default '[]',
  agent_prompts jsonb not null,           -- { claudeCode, cursorWindsurf, v0Bolt }
  difficulty jsonb not null,              -- { soloWeekendProject, estimatedHours, skillFloor }

  status text not null default 'draft' check (status in ('draft', 'needs_evidence', 'published')),
  validation_errors text[],

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- The public list/detail routes filter on status = 'published' for every
-- tier (Task 3, step 5) — this index makes that filter cheap as the table grows.
create index if not exists idea_drops_status_published_at_idx
  on idea_drops (status, published_at desc);

-- Row Level Security is enabled with no policies: the anon/authenticated
-- Supabase roles get zero access. All reads/writes go through the service
-- role key from a Next.js server context (lib/supabase/server.ts), which
-- bypasses RLS entirely. This means even if the anon key were ever exposed
-- client-side, it could not read idea_drops directly.
alter table idea_drops enable row level security;

create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists idea_drops_set_updated_at on idea_drops;
create trigger idea_drops_set_updated_at
  before update on idea_drops
  for each row
  execute function set_updated_at();
