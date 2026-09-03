---
title: I built a pipeline that mines Hacker News, StackExchange, and GitHub Issues for validated startup ideas
published: false
tags: buildinpublic, startup, machinelearning, showdev
canonical_url: https://www.getsourced.dev
---

# I built a pipeline that mines Hacker News, StackExchange, and GitHub Issues for validated startup ideas

The premise behind [Sourced](https://www.getsourced.dev) is simple: the best
signal for "should I build this" isn't a trend report, it's people already
complaining about the problem in public, on multiple platforms,
independently of each other.

So instead of another AI-idea-generator that hallucinates a market, I built
a pipeline that:

1. Polls real complaint sources — Hacker News, GitHub Issues, StackExchange,
   and (as of the latest expansion) Codeberg, Discourse, Mastodon, and
   YouTube comments.
2. Embeds every scraped complaint.
3. Clusters near-duplicate complaints across sources — the same underlying
   problem showing up on three different platforms is much stronger
   evidence than one loud thread.
4. Classifies and drafts a build brief from each cluster that clears a
   signal threshold, ready to paste into Claude Code, Cursor, Windsurf, v0,
   or Bolt.

## The part that actually took the time: clustering

Keyword matching doesn't work here — people describe the same problem in
wildly different language depending on which community they're in. A
Hacker News comment about "duplicate CRM contacts eating an afternoon every
week" and a GitHub issue titled "dedupe API returns 409 on merge" can be the
same underlying complaint, worded nothing alike.

So clustering is embedding-similarity based, not keyword based. The
interesting failure mode: early on, at 370 ingested signals, cross-platform
matching was giving **zero** matches — everything clustered within its own
source, never across. That's a bug, not a feature; if HN and GitHub never
agree with each other, the "independently verified" premise of the whole
product falls apart.

Root cause was a combination of embedding normalization and a similarity
threshold tuned on same-source pairs, which happened to be near-orthogonal
across platforms once phrasing style differences got folded in. Fixing it
took [a normalization pass + threshold retune — happy to go deeper on this
in the comments if people want the specifics].

## Keeping the pipeline free to run

Ingest and classification both default to a local/free stack rather than
a metered API:

- **Classification** runs on Ollama, locally.
- **Draft generation** runs through a self-hosted AI gateway (OmniRoute).
- OpenRouter exists as a fallback path if either local service is
  unreachable, but the account can sit at $0 balance under normal
  operation — the pipeline isn't burning API credits to stay alive.

This matters for a solo project: the ingest pipeline can run continuously
(cron-polling every source, multiple times a day) without a recurring bill
that scales with volume.

## What you get out the other end

Each idea drop on the site shows:
- The evidence — links to the actual raw signals (HN threads, GitHub
  issues, forum posts), not a paraphrase that hides the source.
- A signal count and cross-source match count, so you can gauge how
  independently verified the pattern is.
- A brief written for agent-assisted building — the kind of doc you'd want
  to paste into Claude Code or v0 to get a real first pass, not a vague
  "there's a market for X" pitch.

If you want to see it live: [getsourced.dev](https://www.getsourced.dev)

Happy to answer questions about the embedding/clustering setup, the
Ollama/OmniRoute local-LLM stack, or the poller architecture in the
comments.
