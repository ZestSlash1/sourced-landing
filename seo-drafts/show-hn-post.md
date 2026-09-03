# Show HN post — draft

Post window: Tue–Thu, ~8–10am PT. One shot — don't resubmit if it flops.
URL to submit: https://www.getsourced.dev

## Title (pick one, keep under ~80 chars)

- Show HN: Sourced – validated micro-SaaS ideas mined from real complaints
- Show HN: I built a pipeline that turns HN/GitHub/StackExchange complaints into startup briefs
- Show HN: Sourced – triangulate real complaints into evidence-backed build briefs

(First option is closest to HN norms — plain, no hype adjectives, states what it is.)

## First comment (post immediately after submitting, from the same account)

Hey HN,

I built Sourced because I kept seeing the same complaint pattern: someone
vents about a broken workflow on HN, someone else hits the same wall on a
GitHub issue thread, a third person asks about it on StackExchange — and
nobody connects the three as evidence of the same underlying problem.

Sourced polls Hacker News, GitHub Issues, and StackExchange (recently added
Codeberg, Discourse, Mastodon, and YouTube comments too), embeds every
complaint, and clusters near-duplicates across sources. When enough
independent people are hitting the same wall, that cluster becomes an "idea
drop" — a short brief with the evidence (raw signal links, not summarized
away), the shape of the problem, and a starting point for a build.

Each brief is written to be pasted straight into Claude Code, Cursor,
Windsurf, v0, or Bolt — not a vague "there's a market for X" blog post, but
something you can hand to an agent and start scaffolding from.

Technical bits if anyone's curious:
- Ingest runs on a local/free stack by default — Ollama for classification,
  a self-hosted OmniRoute gateway for draft generation — with OpenRouter as
  a fallback rather than the default, so the pipeline doesn't require a
  funded API budget to run continuously.
- Clustering is embedding-based similarity across sources, not keyword
  matching — the interesting failure mode early on was 0 cross-platform
  matches at 370 signals, which forced me to rethink the similarity
  threshold and normalization (happy to go into that if people want).

Feedback very welcome, especially on whether the briefs are actually
actionable vs. just "here's a Reddit thread, good luck."

## Notes
- Don't editorialize with buzzwords in the title — HN penalizes marketing tone hard.
- Reply to every top-level comment within the first 2 hours; that window decides whether it stays on the front page.
- Have 2-3 idea drops with real signal counts live on the site before posting, so first click doesn't land on an empty feed.
