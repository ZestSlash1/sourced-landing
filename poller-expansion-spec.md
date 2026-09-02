# Sourced — Poller Expansion Spec

## Context

`raw_signals` currently sits around 631 rows from existing pollers (GitHub,
GitLab, Stack Exchange, and whatever others are already wired up — confirm
the current source list by running `select distinct source from raw_signals;`
before starting, so this spec's new sources don't duplicate an existing one
under a different name).

The original roadmap flagged four keyless-or-trivially-authed sources as a
realistic path to 2000+ signals: YouTube comments (dev-channel videos),
Codeberg Issues, Discourse forums, and Mastodon dev instances. Now that the
pgvector migration is done (clustering runs on an HNSW-indexed SQL query
instead of an O(n²) JS loop), the pipeline can absorb this volume increase
without the clustering pass becoming the bottleneck.

## Goal

Add four new pollers, each producing rows in `raw_signals` in the same shape
existing pollers already produce, so the rest of the pipeline (classification,
embedding, clustering, draft generation) needs zero changes to consume them.

## Non-goals

- Changing the classification prompt, clustering logic, or draft generation
  in this pass — new sources should be transparent to everything downstream
  of ingestion
- Building a generic "poller framework" abstraction if one doesn't already
  exist — match whatever pattern the existing pollers use. If they're already
  built as independent modules with a shared interface, follow that. If not,
  don't invent one now; that's a separate refactor, not part of this spec.
- Real-time/webhook-based ingestion. Keep these as polled sources on the same
  cron/manual-trigger cadence as existing pollers.

## Prerequisite — find the existing poller pattern first

Before writing any new poller, locate and read 1-2 existing ones (likely in
`lib/ingest/pollers/` or similar). Match their:
- Input/output shape (what they write to `raw_signals`)
- Error handling and retry conventions
- How they report into `pipeline_runs`
- Rate limiting / pagination approach

Do not invent a new pattern. Consistency with what's already there matters
more than any individual improvement in this pass.

## Source 1 — YouTube comments (dev-channel videos)

### Approach

YouTube Data API v3, `commentThreads.list` endpoint, filtered to a curated
list of developer-focused channels (not a general keyword search across all
of YouTube — too noisy, too much off-topic volume).

### Requirements

- Free API key from Google Cloud Console (YouTube Data API v3 enabled). Quota
  is 10,000 units/day on the free tier; `commentThreads.list` costs 1 unit
  per call, so this comfortably supports polling dozens of videos daily.
- A curated list of target channel IDs — dev tool reviews, "building a SaaS"
  content, indie hacker channels, etc. Start with 10-15 channels. Store this
  list as a config array in the poller file itself (not a DB table — it's a
  small, infrequently-changed list, doesn't need its own admin UI).

### Implementation

- For each channel: `search.list` (or `playlistItems.list` against the
  channel's uploads playlist, cheaper on quota) to get recent video IDs
  (last 30 days)
- For each video: `commentThreads.list` to pull top-level comments
- Filter to comments with reasonable length (>40 chars) to skip low-signal
  "great video!" noise before it ever reaches classification — this is a
  free filter, no reason to burn an LLM call on obviously empty comments
- Map to `raw_signals` shape: `source: 'youtube'`, `url` = comment
  permalink (`https://youtube.com/watch?v={video_id}&lc={comment_id}`),
  `title` = video title (comments don't have their own title, reuse the
  video's), `text` = comment text, `author` = commenter display name,
  `engagement_metric` = like count on the comment, `posted_at` = comment
  timestamp

### Rate limiting

Respect YouTube's quota. Track daily unit usage in `pipeline_runs.meta` (or
equivalent) so a future run doesn't silently blow the quota — log a warning
if projected usage for the channel list would exceed ~8000 units (leaving
headroom).

## Source 2 — Codeberg Issues

### Approach

Codeberg runs Forgejo (a Gitea fork), which exposes a REST API compatible
with Gitea's — no auth required for public repo issue listing, though an API
token raises rate limits if needed later.

### Requirements

None — fully keyless for public repos at reasonable volume.

### Implementation

- Endpoint: `GET https://codeberg.org/api/v1/repos/search` to discover
  active repos (sort by `updated`, filter by some activity threshold), or
  maintain a curated list of dev-tool-relevant Codeberg orgs/repos similar
  to the YouTube channel list — curated is likely better signal-to-noise
  than a blind repo search
- For each repo: `GET /repos/{owner}/{repo}/issues?state=open&sort=created&type=issues`
  (exclude `type=pulls` — only want issues, not PR discussion)
- Map to `raw_signals`: `source: 'codeberg'`, `url` = issue HTML URL,
  `title` = issue title, `text` = issue body, `author` = issue creator
  username, `engagement_metric` = comment count on the issue (a reasonable
  proxy for how much a problem resonated), `posted_at` = issue created_at

### Note

Codeberg's dataset is much smaller than GitHub/GitLab — don't expect huge
volume here. It's included for diversity of source (less GitHub-dominated
signal pool, which matters for both bias reduction and because it's genuinely
free with no rate concerns), not as a primary volume driver.

## Source 3 — Discourse forums

### Approach

Many dev-tool communities run on Discourse (Rust users forum, Svelte,
Meteor, various SaaS company community forums). Discourse exposes a JSON
API on every installation by appending `.json` to most URLs — no auth
needed for public categories.

### Requirements

- A curated list of target Discourse instance base URLs (e.g.
  `https://users.rust-lang.org`, `https://community.n8n.io`, etc.) — same
  config-array pattern as YouTube channels. Aim for 8-12 instances relevant
  to your existing signal categories (dev tools, no-code, SaaS building).

### Implementation

- Endpoint per instance: `GET {base_url}/latest.json` for recent topics, or
  `GET {base_url}/c/{category-slug}/{category-id}.json` to scope to a
  specific category if the instance has an obviously relevant one (e.g. a
  "bugs" or "feature requests" category)
- For each topic: `GET {base_url}/t/{topic_id}.json` to get the full post
  list, take the first post (the topic-starting post is usually the actual
  complaint/question; replies are conversation, lower signal — take the
  first post only in this pass, don't ingest whole threads)
- Map to `raw_signals`: `source: 'discourse'`, `url` = topic URL, `title`
  = topic title, `text` = first post's raw text (Discourse returns both
  `cooked` HTML and `raw` markdown — use `raw`, strip markdown syntax if
  needed, don't ingest HTML), `author` = topic creator username,
  `engagement_metric` = reply count or like count on the first post,
  `posted_at` = topic created_at

### Rate limiting

Discourse instances are independently run — be a good citizen. Add a delay
between requests to the same instance (e.g. 1 request/second) and set a
descriptive `User-Agent` header identifying the poller, so instance admins
can identify traffic if they look at logs.

## Source 4 — Mastodon dev instances

### Approach

Mastodon's public timeline API is keyless for public posts:
`GET /api/v1/timelines/public` per instance. Target dev-focused instances
(e.g. `hachyderm.io`, `fosstodon.org`, `mastodon.social` filtered by
hashtag).

### Requirements

- Curated list of target instance base URLs, same pattern as above.
- Optionally, target specific hashtags relevant to dev complaints (`#devtools`,
  `#buildinpublic`, `#indiehackers`) via
  `GET /api/v1/timelines/tag/{hashtag}` instead of the raw public timeline,
  which is likely to have better signal density than the unfiltered firehose.

### Implementation

- Poll `GET {instance}/api/v1/timelines/tag/{hashtag}?limit=40` per
  hashtag per instance
- Filter out boosts/reblogs (check the `reblog` field — skip if present,
  only want original posts)
- Filter to posts with reasonable length, same >40 char threshold as YouTube
- Map to `raw_signals`: `source: 'mastodon'`, `url` = post URL, `title` =
  null (Mastodon posts don't have titles — leave null or derive a short
  synthetic title from the first ~60 chars if the schema requires non-null;
  check existing poller conventions for how they handle sources without
  natural titles, e.g. Stack Exchange questions do have titles but a raw
  toot doesn't), `text` = post content (strip HTML — Mastodon returns
  `content` as HTML), `author` = account display name or handle,
  `engagement_metric` = combined favourites + reblogs count, `posted_at` =
  post created_at

### Rate limiting

Public Mastodon API is generally unauthenticated and rate-limited per-IP by
each instance (typically 300 req/5min unauthenticated). Same politeness
principle as Discourse — throttle requests, identify via User-Agent.

## Shared implementation notes across all four

- **Dedup**: check `url` doesn't already exist in `raw_signals` before
  inserting (all existing pollers presumably already do this — confirm and
  reuse the same dedup check, don't reinvent)
- **Embedding**: new signals need embeddings generated the same way existing
  ones do (OpenRouter `text-embedding-3-small`, per the pgvector spec) —
  this should already happen automatically if these pollers plug into the
  same pipeline stage existing pollers use. Confirm this is the case rather
  than assuming.
- **Classification**: same — should flow through the existing Ollama
  classifier automatically once rows land in `raw_signals` with `embedding`
  populated. No new classification work needed in this spec.
- **Config**: put each source's curated list (channels, repos, instances,
  hashtags) in a single config file, e.g. `lib/ingest/poller-sources.ts`,
  not scattered across each poller file — makes it easy to add/remove
  targets later without touching poller logic.

## Files to create

- `lib/ingest/pollers/youtube.ts`
- `lib/ingest/pollers/codeberg.ts`
- `lib/ingest/pollers/discourse.ts`
- `lib/ingest/pollers/mastodon.ts`
- `lib/ingest/poller-sources.ts` (shared config: channel IDs, repo lists,
  instance URLs, hashtags)

## Files to modify

- Wherever the poller orchestrator lives (likely `scripts/poll-all.ts`,
  referenced throughout this conversation) — register the four new pollers
  alongside existing ones
- `.env.example` — add `YOUTUBE_API_KEY`
- `pipeline_runs` — if per-source stats aren't already tracked generically,
  extend to log signal counts per new source (should likely already be
  generic enough to not need schema changes — confirm before assuming a
  migration is needed)

## Environment variables

```
YOUTUBE_API_KEY=<from Google Cloud Console>
```

Codeberg, Discourse, and Mastodon need no API keys for this scope.

## Acceptance criteria

- [ ] All four pollers follow the existing poller pattern/interface (confirmed by comparing against an existing poller, not assumed)
- [ ] `poller-sources.ts` config file created with initial curated lists (10-15 YouTube channels, Codeberg repos/orgs, 8-12 Discourse instances, Mastodon instances + hashtags)
- [ ] Each poller correctly dedupes against existing `url` values before insert
- [ ] Each poller respects rate limits / includes a polite delay + User-Agent for Discourse and Mastodon
- [ ] YouTube quota usage is logged and a run warns if projected usage nears the daily cap
- [ ] One full `poll-all` run completes, new rows appear in `raw_signals` with `source` values `youtube`, `codeberg`, `discourse`, `mastodon`
- [ ] New rows get embeddings and classifications automatically via the existing pipeline stages — no manual intervention needed
- [ ] `tsc --noEmit` clean
- [ ] Total signal count after one run is meaningfully higher than the 631 baseline (exact number depends on curated list size and each instance's post volume — report the actual delta, don't target a specific number blindly)

## Rollback plan

Each poller is additive and independent — disabling any one is as simple as
removing it from the orchestrator's registered poller list. No schema
changes beyond what already exists, no risk to existing signal data.

## Notes for the implementer

- Discourse's `raw` field in the JSON API is markdown — decide whether to
  store markdown as-is or strip formatting. Check what existing pollers do
  with markdown-bearing sources (GitHub/GitLab issue bodies are also
  markdown) and match that convention rather than introducing a new one.
- Mastodon's `content` field is HTML, not markdown — needs actual HTML
  stripping (a simple regex or a lightweight library like `sanitize-html`
  in text-extraction mode), different handling than Discourse.
- YouTube quota resets at midnight Pacific time, not on a rolling 24h
  window — factor this into any quota-tracking logic if you want it to be
  precise, though a simple "don't exceed N units per run" check is probably
  sufficient for this pass without needing exact reset-time awareness.
- Curated lists (channels, instances, repos) will go stale over time —
  that's fine, this is a v1. A follow-up pass could make these
  admin-editable via a DB table instead of a hardcoded config file, but
  that's explicitly out of scope here.
