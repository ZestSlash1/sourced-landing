# Handoff Note

> Overwrite this file at the end of every session — whoever picks up next
> (human or agent) reads this before touching anything.

**Last updated by:** Antigravity / Gemini
**Date:** 2026-09-04

## Current state
- Phase 1 & 2 (evidence/build-brief gating, /methodology, /rejected pages)
  shipped. Programmatic SEO pages (`/category`, `/platform/[platform]`,
  `/stack/[technology]`, `/tools/[matched-api]`, `/signals` firehose,
  JSON-LD schemas, BreadcrumbList) shipped and covered by unit tests.
- Ingest pipeline: Bluesky and DevRant pollers implemented, unit tested,
  and wired into cron routes (`/api/cron/ingest-bluesky`,
  `/api/cron/ingest-devrant`), `vercel.json`, and `scripts/poll-all.ts`.
  Discourse poller verified live against expanded instances (109 signals
  retrieved). DevRant verified live against API. Migration
  `0029_add_bluesky_source.sql` created for `raw_signals_source_check`.
- Supabase DB status: 754 raw signals currently stored (234 GitHub, 200
  StackExchange, 181 Hacker News, 81 GitLab, 36 Dev.to, 22 Lobsters).
  491 signals classified as complaints; 444 have embeddings.
- Local LLM infrastructure: Ollama (`localhost:11434`) and OmniRoute
  (`localhost:20128`) are online and responsive on the falcon machine.
- Test suites: 21 test files (128 tests) all passing in Vitest. Coverage
  now includes Razorpay webhook subscription lifecycle handling,
  newsletter capture endpoint, robots.txt, sitemap.xml, and facets.
  Full Next.js production build (`npm run build`) and typecheck verified clean.
- n8n workflow "Sourced — Weekly Drop Draft" is built but **inactive** —
  credentials not wired up, not yet manually tested.
- Razorpay international payments (USD/EUR/GBP) available but not activated
  — needs KYC + purpose code in Razorpay dashboard.

## In progress / next up
- Apply migration `0029_add_bluesky_source.sql` to Supabase instance before
  live Bluesky signal ingestion (DevRant was already permitted in the check constraint).
- Set `BLUESKY_HANDLE` and `BLUESKY_APP_PASSWORD` in `.env.local` / Vercel
  env if Bluesky ingestion is to run actively.
- Run `npm run ingest:dry-run -- --inspect-near-misses` on the expanded
  pipeline to review clustering and near misses with the latest signal volume.
- Wire n8n workflow credentials or test automated weekly drop drafting.

## Watch out for
- Don't re-fix clustering without checking current signal volume first —
  cross-platform threshold remains 0.82 with 3+ signals across 2+ platforms.
- Supabase is shared with Mettel — stick to Sourced's own tables:
  `raw_signals`, `idea_drops`, `idea_drop_views`, `sourced_subscribers`,
  `subscriber_topics`, `events`, `admins`, `settings`, `sourced_newsletter_signups`.
- Product Hunt and Reddit are permanently ruled out — don't re-explore.
- `idea_drops` is a wide table with several jsonb columns (problem,
  evidence, build_brief, matched_apis, launch_stack, agent_prompts,
  difficulty, competitive_landscape) — check the real schema before writing
  migrations.

## How to update this file
When you finish a session: replace "Current state," "In progress," and
"Watch out for" with what's actually true now. Keep it short — this is a
status note, not a changelog. Git history is the changelog.
