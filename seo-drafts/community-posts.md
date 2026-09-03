# Tier 4 community posts

## Indie Hackers — "build in public" milestone post

**Title:** Fixed a bug where my complaint-clustering pipeline never matched
anything across platforms (0/370 signals) — here's what was wrong

Body:

I'm building [Sourced](https://www.getsourced.dev) — it mines real
complaints from Hacker News, GitHub Issues, StackExchange (and now
Codeberg, Discourse, Mastodon, YouTube) and clusters them into validated
micro-SaaS ideas, so the output is "N independent people hit this wall,"
not a vibes-based idea list.

Wanted to share a real build-log moment instead of a launch post.

At 370 ingested signals, cross-platform clustering was returning **zero**
matches — every complaint clustered fine within its own source (HN-to-HN,
GitHub-to-GitHub) but never matched anything from a different platform.
That's not a cosmetic bug — the whole premise of the product is "the same
problem shows up independently on multiple platforms," so if HN and GitHub
never agree with each other, there's no product.

Root cause was embedding normalization + a similarity threshold that had
implicitly been tuned on same-source pairs, which behaved very differently
once cross-source phrasing/style variance got folded in. [Describe your
actual fix here — normalization pass, threshold retune, re-embedding
approach, whatever you actually did.]

Also recently switched the ingest pipeline off a metered API path onto a
local/free default: Ollama for classification, a self-hosted OmniRoute
gateway for draft generation, OpenRouter only as a fallback. Means the
pipeline can poll continuously without a bill that scales with signal
volume — matters a lot as a solo operator.

Happy to answer questions on the embedding/clustering setup or the
local-LLM stack.

---

## r/SideProject — project update (not a pitch)

**Title:** Built a tool that clusters real complaints across HN/GitHub/StackExchange into startup briefs — sharing the clustering bug I just fixed

Body (shorter, less technical depth, same honesty):

Working on [Sourced](https://www.getsourced.dev) on the side — it pulls
complaints from Hacker News, GitHub Issues, and StackExchange (plus a few
smaller sources now), clusters the ones that are really the same underlying
problem even when worded totally differently, and turns validated clusters
into short build briefs you can hand to an AI coding agent.

Just fixed a bug where clustering wasn't matching anything *across*
platforms — 370 signals in and 0 cross-source matches, which meant the
"independently verified" claim wasn't actually true yet. Turned out to be
an embedding normalization issue that only showed up once complaints from
different communities (different phrasing styles) were compared against
each other.

Not selling anything here, just sharing the build — link's in my profile /
above if you want to poke at it.

---

## r/SaaS — same approach, SaaS-audience framing

**Title:** Sharing a real bug from building an idea-validation SaaS: clustering that silently never matched across sources

Body: (reuse r/SideProject body, swap last line to something like:)

If anyone else is building on embeddings for clustering/dedup, curious
whether you've hit the same same-source-bias failure mode — feels like the
kind of thing that's obvious in hindsight but easy to miss when your eval
set is accidentally single-source.

---

## r/indiehackers (Reddit mirror) — cross-post
Reuse the r/SideProject copy verbatim; this subreddit mirrors Indie Hackers
culture, so the "build log, not pitch" framing matters even more here.

---

## Posting order/spacing note
Space r/SideProject, r/SaaS, and the Reddit r/indiehackers post at least a
few days apart with slightly different framing (as drafted above) — an
identical post across three subs in one day reads as spam to mods and to
Reddit's own spam filters.
