# Handoff Note

> Overwrite this file at the end of every session — whoever picks up next
> (human or agent) reads this before touching anything.

**Last updated by:** Antigravity / Gemini
**Date:** 2026-09-04

## Current state
- 1-Click Builder Export for Cursor and Claude Code on `/feed/[slug]` shipped and live:
  - Generates bespoke `.cursorrules` files matching the tech stack, API specifications, and architectural rules of each idea drop (`lib/idea-drops/cursorrules-generator.ts`).
  - Added interactive builder panel (`app/feed/[slug]/builder-export-panel.tsx`) with 1-click downloads for `CLAUDE.md` and `.cursorrules`, CLI curl commands (`curl -s https://www.getsourced.dev/api/ideas/[slug]/spec > CLAUDE.md` and `curl -s https://www.getsourced.dev/api/ideas/[slug]/cursorrules > .cursorrules`), and quick-copy prompts.
  - Added public API endpoint at `/api/ideas/[id]/cursorrules`.
  - Comprehensive unit test coverage (`lib/idea-drops/cursorrules-generator.test.ts`).
- Ingestion, Classification, and Clustering Pass completed:
  - Polled across 12 keyless sources (HN, GitHub, GitLab, YouTube, Codeberg, Discourse, Mastodon, DevRant), inserting 101 new raw signals into `raw_signals`.
  - Paginated PostgREST query in `lib/ingest/raw-signals-repository.ts` (`listUndraftedSignals`) in chunks of 1,000 to load all 2,250+ signals without truncation.
  - Batched `persistClusterKeys` into concurrent chunks of 10 requests, speeding up cluster key writes across the Cloudflare tunnel from minutes to seconds.
- Local Ollama Draft Generation Fallback & OmniRoute Resilience:
  - Added native JSON draft generation via local Ollama (`lib/llm/providers/ollama.ts`) supporting `gemma3:4b` and `qwen2.5:7b-instruct` with grammar-constrained decoding.
  - Added JSON extraction validation in `lib/llm/providers/omniroute.ts` to cleanly catch and retry non-JSON responses.
  - Wired fallback hierarchy in `lib/llm/draft-generator.ts`: OmniRoute -> Local Ollama (`gemma3:4b`) -> OpenRouter.
- New Idea Drops Drafted & In Review:
  - Executed draft pass (`scripts/run-draft-pass.ts`): considered 927 complaints, compared 429,201 pairs, formed 844 clusters.
  - 3 qualifying clusters passed the bar and were drafted to `idea_drops` with `status: 'pending_review'`:
    1. `sourced-2026-09-04-21cdead7` (`SentinelFlow AI`): Validated cross-platform complaint (3 platforms: YouTube, GitLab, Hacker News).
    2. `sourced-2026-09-04-229b36bb` (`Curated Developer News Digest Automator`).
    3. `sourced-2026-09-04-1ce33a9c` (`AI Model Limit Tracker & Cost Monitor`).
  - All 3 drops contain real evidence, build briefs, data models, launch stacks, agent prompts, and grounded competitive gap checks.
- Admin panel, analytics, and auth fully stable:
  - Admin sign-in, session synchronization, `/admin/analytics` maxDuration=60, and parallel queries operational.
- Test suites: 29 test files (156 tests) passing in Vitest. Full Next.js production build (`npm run build`) and typecheck verified clean.

## In progress / next up
- Review the 3 newly drafted drops in `/admin/pending` (`SentinelFlow AI`, `Curated Developer News Digest Automator`, `AI Model Limit Tracker & Cost Monitor`) and publish qualifying drops.
- Evaluate Database Hosting Bundle architecture: review instant dev sandbox DB vs. managed multi-tenant cloud provisioning.
- Set `BLUESKY_HANDLE` and `BLUESKY_APP_PASSWORD` in `.env.local` / Vercel env to activate live Bluesky searching.
- Execute Tier 1 from `sourced-off-page-seo-checklist.md` using drafts in `seo-drafts/` (Show HN, Dev.to, directory submissions).

## Watch out for
- Embeddings are 768 dimensions (`nomic-embed-text`).
- Cross-platform threshold remains 0.82 with 3+ signals across 2+ platforms.
- Supabase is shared with Mettel — stick to Sourced's own tables: `raw_signals`, `idea_drops`, `idea_drop_views`, `sourced_subscribers`, `subscriber_topics`, `events`, `admins`, `settings`, `sourced_newsletter_signups`.
- Product Hunt and Reddit are permanently ruled out — don't re-explore.
- `idea_drops` is a wide table with several jsonb columns (problem, evidence, build_brief, matched_apis, launch_stack, agent_prompts, difficulty, competitive_landscape) — check the real schema before writing migrations.

## How to update this file
When you finish a session: replace "Current state," "In progress," and
"Watch out for" with what's actually true now. Keep it short — this is a
status note, not a changelog. Git history is the changelog.
