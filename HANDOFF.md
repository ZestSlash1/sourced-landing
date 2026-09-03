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
- Ingest pipeline & DB status:
  - 1,000 raw signals in Supabase (`raw_signals`).
  - 527 signals classified as complaints (51.3% complaint ratio), 470 non-complaints, 3 unclassified.
  - All 779 unclassified signals were classified by local Ollama (`localhost:11434`, model: `gemma3:4b`) with 0 errors.
  - Migration `0029_add_bluesky_source.sql` applied to Supabase database.
  - Bluesky and DevRant pollers implemented, unit tested, and wired into cron routes (`/api/cron/ingest-bluesky`, `/api/cron/ingest-devrant`), `vercel.json`, and `scripts/poll-all.ts`.
- Local infrastructure:
  - Self-hosted Supabase containers (`C:\Users\falcon\homelab\supabase-sourced\docker`) are running and healthy.
  - Local Ollama (`localhost:11434`) and OmniRoute (`localhost:20128`) are online and responsive.
- Visual / Interactive: Cursor-reactive Antigravity motion background (`app/antigravity-canvas.tsx`) implemented and mounted in `app/layout.tsx`. Features physics-based microgravity float, cursor deflection with inertia, and dynamic violet triangulation filaments respecting reduced motion and tab visibility.
- Test suites: 21 test files (128 tests) passing in Vitest. Full Next.js production build (`npm run build`) and typecheck verified clean.
- Embedding blocker: OpenRouter returned 402 ("Insufficient credits") when generating embeddings for the 437 newly classified complaints using `openai/text-embedding-3-small`. 76 complaints currently have embeddings. Adding a small credit balance on OpenRouter (or adding `OPENAI_API_KEY`) will embed the remaining 437 complaints and allow the full 527-complaint pool to cluster.
- n8n workflow "Sourced — Weekly Drop Draft" is built but **inactive** — credentials not wired up, not yet manually tested.
- Razorpay international payments (USD/EUR/GBP) available but not activated — needs KYC + purpose code in Razorpay dashboard.

## In progress / next up
- Top up OpenRouter credits (or add an `OPENAI_API_KEY`) to run `npm run ingest:dry-run` and generate embeddings for the 437 newly classified complaints so they can cluster.
- Set `BLUESKY_HANDLE` and `BLUESKY_APP_PASSWORD` in `.env.local` / Vercel env to activate live Bluesky searching.
- Wire n8n workflow credentials or test automated weekly drop drafting.
- Execute Tier 1 from `sourced-off-page-seo-checklist.md` using drafts in `seo-drafts/` (Show HN, Dev.to, directory submissions).

## Watch out for
- Don't re-fix clustering without checking current signal volume first — cross-platform threshold remains 0.82 with 3+ signals across 2+ platforms.
- Supabase is shared with Mettel — stick to Sourced's own tables: `raw_signals`, `idea_drops`, `idea_drop_views`, `sourced_subscribers`, `subscriber_topics`, `events`, `admins`, `settings`, `sourced_newsletter_signups`.
- Product Hunt and Reddit are permanently ruled out — don't re-explore.
- `idea_drops` is a wide table with several jsonb columns (problem, evidence, build_brief, matched_apis, launch_stack, agent_prompts, difficulty, competitive_landscape) — check the real schema before writing migrations.

## How to update this file
When you finish a session: replace "Current state," "In progress," and
"Watch out for" with what's actually true now. Keep it short — this is a
status note, not a changelog. Git history is the changelog.
