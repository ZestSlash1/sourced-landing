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
  `sourced_subscribers`, `subscriber_topics`, `events`, `admins`, `settings`.
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
needs an App Password) → embed via OpenRouter text-embedding-3-small →
cosine similarity clustering (threshold 0.82, needs 3+ signals across 2+
platforms) → OpenRouter draft → admin review → publish.

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
- Don't change the clustering threshold (0.82) without discussion — it was
  tuned deliberately.
- Don't touch Mettel's Supabase tables.
