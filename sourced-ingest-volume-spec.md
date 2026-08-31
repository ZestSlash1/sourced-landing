# Sourced — Ingest Volume Expansion Spec

## Context

Current pipeline: pollers (HN, Stack Exchange, GitHub Issues, Dev.to, Lobsters — all keyless) → embed via OpenRouter text-embedding-3-small → cosine similarity clustering (threshold 0.82, needs 3+ signals across 2+ platforms) → OpenRouter draft → admin pending-review queue → publish.

As of the last pipeline run (8/31/2026): 394 total signals, 385 clusters formed, **0 clusters passing the 3+/2-platform bar**. The clustering logic isn't broken — at this signal volume, genuine same-complaint overlap across platforms is rare. This spec increases signal volume so clusters actually clear the threshold, without touching the clustering/threshold logic itself.

Reddit was investigated and is a dead end for this product: as of 2026, Reddit's Responsible Builder Policy requires manual approval even for the free tier (commonly rejected for small/commercial-adjacent projects), and any monetized use — which Sourced is — falls under the commercial tier, reported at ~$12,000/month minimum. Not pursuing.

## Part 1 — Widen existing sources (do this first, cheapest, no new integrations)

### 1a. Stack Exchange: expand beyond StackOverflow
The Stack Exchange API (still free, keyless, same auth model already implemented) covers the whole network via the `site` parameter. Currently likely only pulling `stackoverflow`. Add these sites to the existing poller's site list:
- `softwareengineering.stackexchange.com`
- `webapps.stackexchange.com`
- `ux.stackexchange.com`
- `serverfault.com`
- `superuser.com`

Same endpoint shape, same rate limits (10,000 req/day shared quota — note this is a *shared* quota across all sites queried, so confirm current usage isn't already near the ceiling before adding 5x the sites).

### 1b. GitHub Issues: switch from fixed repo list to Search API
Currently polling a fixed list of ~22 repos. Replace with (or add alongside) GitHub's Search API (`/search/issues`), querying across all public repos for issue titles/bodies matching complaint-shaped phrases:
- `"I wish" in:body`
- `"is there a way to" in:body`
- `"frustrating" in:body`
- `"workaround for" in:body`
- `"no easy way to" in:body`

Combine with `is:issue is:open` and a reasonable date filter (e.g. last 90 days) to keep result sets fresh and manageable. This is unauthenticated-eligible but rate limits are much better with a GitHub personal access token (60/hr unauthenticated vs 5,000/hr authenticated) — recommend generating a token and adding it as an env var if not already done, since this query pattern will hit the API far more than the fixed-repo-list version did.

### 1c. Hacker News: confirm comments are included, not just submissions
Algolia's HN Search API (`http://hn.algolia.com/api/v1/search`) supports `tags=comment` in addition to `tags=story`. If the current poller only pulls stories, add a second query path for comments — "Ask HN" threads in particular tend to have far more raw complaint density in the replies than in the original post. Same endpoint, same auth (none), just an additional query.

## Part 2 — New sources (add after Part 1 is deployed and re-run once)

### 2a. GitLab Issues API
Structurally identical to the existing GitHub Issues poller — build as a sibling module reusing the same complaint-phrase-matching approach from 1b.
- Endpoint: `https://gitlab.com/api/v4/issues` (or per-project `/projects/:id/issues` if scoping to specific projects)
- No auth required for public projects; a personal access token raises rate limits if needed later
- Same normalization target as the GitHub Issues signals (title, body, url, created_at, platform: "gitlab")

### 2b. DevRant API
Complaint-native platform — every item on it is already a "rant," so expect a higher signal-to-noise ratio than any current source, even though raw volume will be lower.
- No official public docs, but the API is widely used unauthenticated (`https://devrant.com/api/rants?sort=recent&limit=50`) — verify current endpoint shape and any rate-limit behavior before wiring it in, since this is an unofficial/reverse-engineered API and could change without notice
- Normalize into the same signal shape (title/body → single text field since DevRant posts don't have a title, platform: "devrant")

## Acceptance checklist
- [ ] Stack Exchange poller pulls from all 6 sites listed in 1a; confirm daily request volume stays under the shared 10,000/day quota
- [ ] GitHub poller uses Search API with the phrase-match queries in 1b; confirm token is set and authenticated rate limit (5,000/hr) is being used, not the 60/hr unauthenticated limit
- [ ] HN poller pulls both `tags=story` and `tags=comment`
- [ ] Signal counts increase materially on next pipeline run (compare against the 394 baseline from 8/31/2026) — record new total in `pipeline_runs`
- [ ] After Part 1 ships and one pipeline run completes, check whether any clusters now clear the 3+/2-platform bar; if still zero, that's a decision point (lower threshold vs. keep adding sources) rather than a bug
- [ ] GitLab poller added, normalizing into the same signal shape as existing pollers, tagged `platform: "gitlab"`
- [ ] DevRant poller added, tagged `platform: "devrant"`, with a note in code/comments that the API is unofficial and may need monitoring for breakage
- [ ] No changes made to clustering threshold, embedding logic, or admin review flow — this spec is sourcing-only
