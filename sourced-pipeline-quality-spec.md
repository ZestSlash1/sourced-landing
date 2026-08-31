# Sourced — Pipeline Quality Spec (Classification + Normalization)

## Context

The ingest volume expansion (Stack Exchange network, GitHub Search API, HN comments, GitLab, DevRant) shipped and increased raw signal count, but a dry run still produced **zero clusters passing the 3+ signals / 2+ platforms bar**. Inspection of the 6 near-miss clusters showed the added volume was mostly noise: templated GitLab feature-flag tickets, recurring Dev.to community columns ("What was your win this week?!", "Meme Monday"), and single-platform size-2 clusters about products/news rather than unmet needs.

**The diagnostic number: 385 clusters from 394 signals.** Roughly one cluster per signal means near-everything is a singleton — the clusterer is effectively not clustering. This is not a volume problem and not (yet) a threshold problem. Two structural causes:

1. **No complaint gate.** Every polled item is embedded and clustered regardless of whether it is a complaint. Show HN launches, news links, rollout tickets, and community threads cannot cluster into unmet needs even in principle, and they dilute the pool while consuming embedding spend.
2. **Embedding raw prose.** Cosine similarity over raw title+body compares writing style as much as meaning. The same underlying pain expressed as a GitLab issue, an HN comment, and a Stack Exchange question looks nothing alike as text. This is why the Jaccard→cosine migration helped but did not solve the problem — the metric changed, the input did not.

This spec addresses both with a single LLM pre-pass. **It does not change the clustering threshold or the min-platform bar** — that stays a separate, deliberate decision made *after* this ships, judged against real clusters rather than noise.

## Part 1 — Poller-level noise filters (cheap hygiene, do first)

Structural exclusions that will never be genuine signal regardless of downstream logic. Implement as a per-poller title/pattern blocklist.

### Dev.to
Exclude posts whose titles match recurring community-column patterns (case-insensitive, substring or regex):
- `What was your win this week`
- `Meme Monday`
- `Welcome Thread`
- `Weekly Retro`
- `What are you working on`
Recommend implementing as a configurable list rather than hardcoded, since Dev.to adds and retires these columns over time. Also consider excluding posts tagged `discuss`, `watercooler`, or `meme` if the poller has tag access.

### GitLab
Exclude issues whose titles match templated rollout/housekeeping patterns:
- `[Feature flag]`
- `Enable ` / `Roll out ` when combined with a feature-flag label
- Issues authored by known bot accounts
Note: this may substantially reduce GitLab's yield. If GitLab drops to near-zero usable signal after filtering, that is a legitimate finding — flag it rather than loosening the filter to keep the number up.

### All pollers
Drop items below a minimum body length (suggest ~120 chars) — too short to contain an articulable problem.

## Part 2 — Complaint classification + normalization pass (the actual fix)

Insert a new stage **between polling and embedding**. One LLM call per new signal, via the existing OpenRouter integration. Use a cheap/fast model — this is a classification task, not a drafting task, and it runs on every signal.

### Output contract
Model must return JSON only, no prose, no markdown fences:
```json
{
  "is_complaint": true,
  "problem_statement": "Solo bookkeepers cannot export client-ready P&L statements without manual cleanup in a spreadsheet",
  "domain": "accounting-tools",
  "confidence": 0.85
}
```

Field rules:
- `is_complaint` — true only if the signal expresses an **unmet need, friction, or workaround** experienced by the author or someone they describe. Product launches, announcements, news discussion, questions with a clean documented answer, and general commentary are all `false`.
- `problem_statement` — a single normalized sentence in a consistent voice: *who* is blocked, and *what* they can't do. This is the field that gets embedded. Consistency of voice is the entire point; the prompt must enforce a fixed grammatical shape so that two signals about the same pain from different platforms produce near-identical statements.
- `domain` — coarse category from a fixed enum, used later for filtering/browse. Reuse the curated topic list already defined for the customer-facing feed rather than inventing a new taxonomy.
- `confidence` — model's own confidence in the classification.

### Pipeline wiring
- Signals with `is_complaint: false` are stored (do not delete — keep for audit and for the `/rejected` page) but **flagged as excluded from embedding and clustering**. Add a column such as `classified_as_complaint` and `problem_statement` on `raw_signals`.
- Signals with `is_complaint: true` and `confidence` above a floor (suggest 0.6 to start) proceed to embedding.
- **Embed `problem_statement`, not the raw title/body.** This is the single most important change in this spec.
- Classification runs once per signal and is persisted — never re-classify on subsequent pipeline runs.

### Backfill
Run the classification pass over the existing signal corpus so the first post-change clustering run has the full history normalized, not just newly polled items. Report how many existing signals classify as complaints — that ratio is itself a key finding about source quality.

### Cost control
This adds one LLM call per signal. At current volume this is small, but it scales linearly with the volume expansion already shipped. Add a per-run cap and log classification spend to `pipeline_runs` alongside the existing counters.

## Part 3 — Observability (needed to judge Part 4)

Extend `pipeline_runs` to record, per run:
- signals polled, signals filtered by Part 1 noise rules (broken down per poller)
- signals classified complaint vs. non-complaint (and the ratio)
- signals embedded
- clusters formed, cluster size distribution (how many size-1 vs size-2 vs size-3+)
- clusters passing the bar

The **cluster size distribution** is the number to watch. If normalization works, the singleton rate should fall well below the current ~98%. If it doesn't move, the problem is upstream of clustering and adding more sources is definitively not the answer.

## Part 4 — Threshold decision (do NOT do in this spec)

Only after Parts 1–3 ship and one full run completes with backfilled classification. At that point, evaluate against real clusters:

- If clusters are forming but still failing the **2+ platform** requirement specifically, the open question is whether cross-platform overlap is the right proxy for validated demand at all. Three independent complaints from three distinct authors on one platform, spread over time, may be stronger evidence than two thin cross-platform mentions. Changing this changes what Sourced promises its subscribers, so it is a product decision, not a tuning knob.
- If clusters are still not forming at all, the problem is the normalization prompt (statements not consistent enough to be comparable) — iterate on the prompt before touching the threshold.

Do not adjust `0.82`, `3+`, or `2+ platforms` as part of implementing this spec.

## Acceptance checklist
- [ ] Per-poller noise filters implemented as configurable lists; Dev.to community columns and GitLab feature-flag tickets excluded
- [ ] Minimum body-length filter applied across all pollers
- [ ] Classification stage added between polling and embedding, returning the JSON contract above, with malformed responses handled (do not crash the run — log and skip)
- [ ] `raw_signals` extended with `classified_as_complaint`, `problem_statement`, `domain`, `confidence`
- [ ] Embedding now runs on `problem_statement`, not raw title/body
- [ ] Non-complaint signals retained and surfaced on `/rejected` with reason
- [ ] Classification persisted and never re-run for an already-classified signal
- [ ] Backfill completed over existing corpus; complaint-vs-total ratio reported
- [ ] `pipeline_runs` records the counters in Part 3, including cluster size distribution
- [ ] Clustering threshold (0.82), min signals (3), and min platforms (2) all unchanged
- [ ] Dry run performed and reported before any `cluster_key` is persisted or anything is drafted
