# Handoff Note

> Overwrite this file at the end of every session — whoever picks up next
> (human or agent) reads this before touching anything.

**Last updated by:** Claude (chat) — initial setup, not yet tied to a commit
**Date:** 2026-09-04

## Current state
- Phase 1 & 2 (evidence/build-brief gating, /methodology, /rejected pages)
  shipped. SEO foundations shipped (sitemap, robots, metadata, JSON-LD).
- Ingest pipeline: 5 live poller sources (HN, StackExchange, GitHub Issues,
  Dev.to, Lobsters) plus newly built Bluesky and DevRant pollers, and 3
  verified-live Discourse instances. As of the last pipeline run: 394
  signals, 385 clusters, **0 clusters passing the 3+/2-platform bar.**
  Cosine similarity (threshold 0.82) replaced Jaccard for clustering in
  Aug 2026 — the expectation is this improves as signal volume grows, not
  that there's still a bug to chase.
- Pipeline classification/drafting is being switched to local Ollama +
  self-hosted OmniRoute (gemini-3.1-pro on the falcon machine). OpenRouter
  becomes fallback-only.
- n8n workflow "Sourced — Weekly Drop Draft" is built but **inactive** —
  credentials not wired up, not yet manually tested.
- Written but not yet executed: payment e2e test spec, email/newsletter
  capture spec, technical SEO audit spec.
- Razorpay international payments (USD/EUR/GBP) available but not activated
  — needs KYC + purpose code in Razorpay dashboard.

## In progress / next up
- Nothing actively mid-edit as of this note — this is a fresh baseline.
  Next session should pick from the "written but not yet executed" specs
  above, or continue the ingest volume expansion work (GitLab Issues and
  DevRant-adjacent sources were flagged as planned next additions).

## Watch out for
- Don't re-fix clustering without checking current signal volume first —
  0 cross-platform passes at 394 signals is expected, not necessarily a bug.
- Supabase is shared with Mettel — stick to Sourced's own tables.
- Product Hunt and Reddit are permanently ruled out — don't re-explore.
- `idea_drops` is a wide table with several jsonb columns (problem,
  evidence, build_brief, matched_apis, launch_stack, agent_prompts,
  difficulty, competitive_landscape) — check the real schema before writing
  migrations, it's easy to drift from what's actually there.

## How to update this file
When you finish a session: replace "Current state," "In progress," and
"Watch out for" with what's actually true now. Keep it short — this is a
status note, not a changelog. Git history is the changelog.
