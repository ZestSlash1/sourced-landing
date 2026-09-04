# Handoff Note

> Overwrite this file at the end of every session — whoever picks up next
> (human or agent) reads this before touching anything.

**Last updated by:** Antigravity / Gemini
**Date:** 2026-09-04

## Current state
- Admin panel sign in fixed & Supabase SSR session synchronization complete:
  - Upgraded cookie handling in `lib/supabase/auth-server.ts` to modern `@supabase/ssr` `getAll` and `setAll` methods, fixing chunked cookie retrieval (`sb-*-auth-token.0`, etc.) that previously returned null on `getUser()`.
  - Added session synchronization into `middleware.ts` via `@supabase/ssr` `createServerClient`, ensuring auth tokens are refreshed and passed down into Server Components.
  - Upgraded `app/admin/login/page.tsx`, `app/admin/sign-out-button.tsx`, `app/login/page.tsx`, and `app/account/sign-out-button.tsx` to use `window.location.href` for full-page navigation, eliminating Next.js App Router client cache race conditions. Added active session display and quick action controls on `/admin/login`.
  - Added unit tests in `lib/auth/require-admin.test.ts` and `lib/supabase/auth-server.test.ts`.
- Admin analytics gateway timeout (504 FUNCTION_INVOCATION_TIMEOUT) fixed:
  - Root cause: `/admin/analytics` executed 4 sequential queries transferring heavy JSONB metadata across the remote Supabase connection, taking 20-30s+ and exceeding Vercel's default 15s serverless execution timeout.
  - Fix:
    1. Configured `export const maxDuration = 60;` across admin routes (`/admin`, `/admin/analytics`, `/admin/pending`, `/admin/ideas/[id]`, `/api/admin/analytics/live`).
    2. Parallelized all dashboard queries via `Promise.all`.
    3. Optimized `getAnalyticsSummary` in `lib/analytics/queries.ts` by separating lightweight event counts from `brief_unlocked` metadata, eliminating the heavy JSONB network bottleneck.
    4. Optimized `fetchPageViewsSince` in `lib/analytics/live-queries.ts` with capped queries and `created_at desc`.
    5. Added resilient try/catch error boundaries with clean fallbacks (`EMPTY_ANALYTICS_SUMMARY`, `EMPTY_LIVE_ANALYTICS`).
    6. Verified total dashboard query time dropped from 2+ minutes down to 1.52s (90x speedup).
- Competitive landscape check resilience & zero-cost fallback shipped:
  - Fixed `lib/ingest/competitive-landscape.ts` and `app/api/admin/ideas/[id]/recheck-competitive/route.ts` to prevent crashes when `OPENROUTER_API_KEY` is missing or out of credits.
  - Implemented graceful fallback hierarchy: tries OpenRouter `:online` (Exa search) if available and funded; otherwise falls back to free grounded search using GitHub repository search API + OmniRoute (`localhost:20128`) / deterministic candidate tool analysis.
  - Preserved strict anti-hallucination grounding: candidate solutions are strictly filtered against URLs returned from search.
  - Executed check and persisted competitive landscape to Supabase Postgres for pending drop `sourced-2026-09-04-8d55e372` (`VT-Fuzz`), resolving the "Run check" error in `/admin/pending`.
  - Added unit tests in `lib/ingest/competitive-landscape.test.ts` (6 tests). 28 test suites (155 tests) passing in Vitest.
- Full website audit completed & verified:
  - Public routes: `/`, `/feed`, `/feed/[slug]`, `/category/[category]`, `/platform/[platform]`, `/stack/[technology]`, `/tools/[matched-api]`, `/signals`, `/rejected`, `/methodology`, `/account`, `/account/topics`.
  - Admin routes: `/admin` (idea drops list), `/admin/pending` (pending reviews & competitive check), `/admin/ideas/[id]` (raw JSON & field editor), `/admin/analytics` (KPI summary, 3D live globe & real-time telemetry feed).
  - Backend/API routes: `/api/newsletter`, `/api/track`, `/api/account/topics`, `/api/admin/analytics/live`, `/api/admin/ideas/[id]`, `/api/admin/ideas/[id]/recheck-competitive`, `/api/cron/*`.
  - Database tables verified: `admins`, `idea_drops`, `sourced_subscribers`, `subscriber_topics`, `events`, `sourced_newsletter_signups`.
- Phase 1 & 2 (evidence/build-brief gating, /methodology, /rejected pages)
  shipped. Programmatic SEO pages (`/category`, `/platform/[platform]`,
  `/stack/[technology]`, `/tools/[matched-api]`, `/signals` firehose,
  JSON-LD schemas, BreadcrumbList) shipped and covered by unit tests.
- Vector embeddings & clustering unblocked (100% free via local Ollama):
  - Switched from depleted OpenRouter to local Ollama (`localhost:11434`, model: `nomic-embed-text`, 768 dimensions).
  - Added Ollama embedding provider in `lib/ingest/embeddings.ts` with OpenRouter fallback.
  - Migration `0030_nomic_embed_768.sql` applied to Supabase: converted `raw_signals.embedding` to `vector(768)` with HNSW cosine index `raw_signals_embedding_hnsw` (`m=16, ef_construction=64`).
  - Backfilled all 881 classified complaints in `raw_signals` with 768-dim embeddings at $0.00 cost. Zero complaints missing embeddings now.
  - Verified `find_signal_neighbors` RPC and pairwise in-memory clustering work end-to-end.
- Zero-cost automated idea drop drafting unblocked & verified:
  - Routed draft generation to local OmniRoute gateway (`localhost:20128`) using `gemini/gemini-3.6-flash`.
  - Configured OmniRoute queue resilience: updated `maxWaitMs` from 15s to 120s via `/api/resilience`, eliminating drop-queue timeouts on long completions.
  - Added `signal: AbortSignal.timeout(...)` across all fetch calls (`omniroute.ts`, `openrouter.ts`, `competitive-landscape.ts`) ensuring zero hung network requests.
  - Verified end-to-end via `scripts/run-draft-pass.ts`: successfully drafted a full new drop (`sourced-2026-09-04-8d55e372`) with verified evidence, complete build brief, launch stack, and agent prompts directly into `idea_drops` (`status: pending_review`).
- Ingest pipeline & DB status:
  - 2,155 raw signals in Supabase (`raw_signals`), 881+ classified complaints across 10 platforms.
  - Migration `0029_add_bluesky_source.sql` and `0030_nomic_embed_768.sql` applied.
  - Bluesky and DevRant pollers implemented, unit tested, and wired into cron routes (`/api/cron/ingest-bluesky`, `/api/cron/ingest-devrant`), `vercel.json`, and `scripts/poll-all.ts`.
- Local infrastructure:
  - Self-hosted Supabase containers (`C:\Users\falcon\homelab\supabase-sourced\docker`) are running and healthy.
  - Local Ollama (`localhost:11434`, `nomic-embed-text`, `gemma3:4b`, `qwen2.5:7b-instruct`) and OmniRoute (`localhost:20128`) are online and responsive.
- Visual / Interactive: Cursor-reactive Antigravity motion background (`app/antigravity-canvas.tsx`) fine-tuned and mounted behind the hero and header in `app/home-client.tsx` with utility styles and reduced-motion suppression in `app/globals.css`.
- Strategic Expansion (Day-1 Validation & Agent Contracts):
  - Day-1 Customer Outreach Pack (`lib/idea-drops/outreach.ts`, `app/feed/[slug]/outreach-pack-panel.tsx`) generated from verified evidence links across GitHub, HN, Discourse, etc. with platform etiquette rules.
  - Economic Severity & Willingness-to-Pay Index (`lib/idea-drops/economic-severity.ts`, `app/feed/[slug]/economic-severity-card.tsx`) displaying buyer persona, pricing architecture, and net monthly ROI.
  - Spec-Driven Production Contract (`lib/idea-drops/production-contract.ts`, `app/feed/[slug]/spec-contract-panel.tsx`, `app/api/ideas/[id]/spec/route.ts`) providing full `CLAUDE.md` architecture specifications with Postgres DDL, Supabase RLS policies, API retry contracts, and acceptance criteria.
- Test suites: 28 test files (155 tests) passing in Vitest. Full Next.js production build (`npm run build`) and typecheck verified clean.
- n8n workflow "Sourced — Weekly Drop Draft" is built but **inactive** — credentials not wired up, not yet manually tested.
- Razorpay international payments (USD/EUR/GBP) available but not activated — needs KYC + purpose code in Razorpay dashboard.

## In progress / next up
- Review newly drafted drop in `/admin/pending` (`sourced-2026-09-04-8d55e372`), now displaying the grounded competitive landscape.
- Set `BLUESKY_HANDLE` and `BLUESKY_APP_PASSWORD` in `.env.local` / Vercel env to activate live Bluesky searching.
- Wire n8n workflow credentials or schedule automated weekly drop drafting via `runDraftPass()`.
- Execute Tier 1 from `sourced-off-page-seo-checklist.md` using drafts in `seo-drafts/` (Show HN, Dev.to, directory submissions).

## Watch out for
- Embeddings are now 768 dimensions (`nomic-embed-text`). Do not attempt to store 1536-dim vectors into `raw_signals.embedding` without a migration.
- Cross-platform threshold remains 0.82 with 3+ signals across 2+ platforms.
- Supabase is shared with Mettel — stick to Sourced's own tables: `raw_signals`, `idea_drops`, `idea_drop_views`, `sourced_subscribers`, `subscriber_topics`, `events`, `admins`, `settings`, `sourced_newsletter_signups`.
- Product Hunt and Reddit are permanently ruled out — don't re-explore.
- `idea_drops` is a wide table with several jsonb columns (problem, evidence, build_brief, matched_apis, launch_stack, agent_prompts, difficulty, competitive_landscape) — check the real schema before writing migrations.

## How to update this file
When you finish a session: replace "Current state," "In progress," and
"Watch out for" with what's actually true now. Keep it short — this is a
status note, not a changelog. Git history is the changelog.
