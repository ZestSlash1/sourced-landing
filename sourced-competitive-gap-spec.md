# Sourced — Competitive Gap Check (Draft-Time Addition)

## Context

User feedback (in-app comment, "Top 1% Poster," on a published idea): "Real complaints beat AI hallucinations every time. Have you considered adding a quick competitor gap check for each idea? That would round out the brief nicely."

This is worth building well because it reinforces Sourced's core positioning against every generic AI idea-generator: real evidence, not model guesses. The implementation has one hard constraint that makes or breaks the trust value: it must be grounded in an actual web search performed at draft time, never an LLM answering "what competitors exist" from training data.

## Implementation (shipped)

- `lib/ingest/competitive-landscape.ts` — one OpenRouter `:online` call per cluster. Any competitor URL not backed by a real `url_citation` annotation from the search is dropped; a search that returns zero citations at all is treated as a failed check, not a fabricated one.
- Wired into `lib/ingest/run-draft-pass.ts` right after `draftIdeaFromCluster`, same cadence as drafting (once per cluster, draft time only). A failed check leaves `competitiveLandscape` null on the idea rather than blocking the draft.
- `idea_drops.competitive_landscape jsonb` (migration `0020_idea_drops_competitive_landscape.sql`), plus `pipeline_runs.competitive_checks_run` / `competitive_check_errors` / `competitive_check_cost_usd` for cost observability, same pattern as classification.
- Admin pending-review queue (`app/admin/pending/competitive-landscape-panel.tsx`) shows the verdict, cited solutions, and a manual re-check button; a `close_competitor_exists` verdict triggers a confirmation dialog on Approve but never blocks it.
- Public idea page (`app/feed/[slug]/page.tsx`) renders a "Competitive landscape" section after the build brief, with a visible `checkedAt` date on every verdict including `no_direct_competitor`.
- `scripts/backfill-competitive-landscape.ts` (`npm run ingest:backfill-competitive`) — run once against every published idea missing the check.

## Env

`OPENROUTER_COMPETITIVE_MODEL` — optional override for the base model; the `:online` suffix is appended automatically. Uses the existing `OPENROUTER_API_KEY`.
