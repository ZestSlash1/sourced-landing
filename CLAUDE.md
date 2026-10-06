# Sourced — Agent Conventions

Weekly-drop micro-SaaS idea marketplace for vibe coders. Real complaints
clustered across platforms, each drop ships with a build brief + agent
prompts for Claude Code/Cursor/Windsurf/v0/Bolt.

Live at www.getsourced.dev. Repo: ZestSlash1/sourced-landing (branch: `main`
is production, deployed via Vercel from `main`).

## Before you start
1. Read `/HANDOFF.md` — it has the current state, what's in progress, and
   any known gotchas. Update it before you stop working.
2. If there's an active spec in `/specs/`, read it fully before touching code.
3. Assume another agent (Claude or Gemini/Antigravity) may have made the last
   commit. Don't trust your own memory of "where things are" — check git log
   and `/HANDOFF.md` first.

## Stack
- Next.js App Router, deployed on Vercel
- Supabase — **this instance is SHARED with the Mettel project**. Only touch
  Sourced tables: `raw_signals`, `idea_drops`, `idea_drop_views`,
  `sourced_subscribers`, `subscriber_topics`, `events`, `admins`, `settings`,
  `pipeline_runs`, `candidate_pairs`, `pipeline_jobs`.
  Never modify Mettel-owned tables without explicit confirmation.
- Razorpay for payments (INR pricing, India-based). International payments
  (USD/EUR/GBP) are supported by Razorpay but not yet activated — needs KYC +
  purpose code P0802/P0807 in the Razorpay dashboard.
- Pipeline classification/drafting: local Ollama + self-hosted OmniRoute
  (gemini-3.1-pro via localhost:20128 on the "falcon" machine). OpenRouter is
  a dormant fallback only — not required for the pipeline to run.
- Design system: Space Grotesk / JetBrains Mono, violet accent, card/chip UI
  language. Match this — don't introduce new fonts or accent colors without
  asking.

## Ingest pipeline (context, not a to-do list)
Pollers (HN, StackExchange, GitHub Issues, Dev.to, Lobsters, Bluesky,
DevRant, select Discourse instances — all keyless except Bluesky, which
needs an App Password) → embed (local Ollama `nomic-embed-text`, OpenRouter
`text-embedding-3-small` as fallback) → cosine similarity clustering
(threshold 0.74, needs 3+ signals, 1+ platform — see `lib/ingest/clustering.ts`
for the actual current constants before assuming this doc is up to date) →
Ollama/OmniRoute draft → admin review → publish. Vercel can't reach the local
LLMs, so on prod the draft pass (admin banner + `draft-ideas` cron) is only
enqueued in `pipeline_jobs`; `npm run worker` on falcon claims and runs it. A separate, flag-gated
(`ENABLE_TIERED_CLUSTERING`, off by default) tiered-clustering path exists in
`lib/ingest/tiered-clustering.ts` with its own 0.82/0.55 bands and an LLM
arbiter stage — see HANDOFF.md for status before enabling it anywhere.

Reddit and Product Hunt are permanently ruled out as sources (Reddit:
commercial API tier too expensive; Product Hunt: signal shape doesn't fit —
feedback is mostly one-sided/positive, sparse criticism). Hashnode ruled out
— free GraphQL tier retired.

## Conventions
- Commit messages: short, imperative, factual ("fix cluster_key persistence
  bug", not "Fixed a bug!"). No AI-attribution footers.
- Prefer editing existing files over creating parallel new ones.
- Don't touch `idea_drops` schema without checking `/HANDOFF.md` and the
  real column list documented there first — it's a wide jsonb-heavy table
  and easy to drift from.
- Run whatever the project's test/lint command is before committing (check
  `package.json` scripts — don't assume a command that isn't there).

## Do not
- Don't re-attempt Reddit ingestion.
- Don't change the clustering threshold(s) in `lib/ingest/clustering.ts`
  (currently 0.74) or `lib/ingest/tiered-clustering.ts` (0.82/0.55) without
  discussion — both were tuned deliberately. Check the code for the current
  number before citing one; this file has gone stale on this exact point
  before.
- Don't touch Mettel's Supabase tables.
