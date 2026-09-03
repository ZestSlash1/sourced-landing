# Twitter/X build-in-public thread — draft

1/
Building a tool that mines real complaints from HN, GitHub Issues, and
StackExchange, clusters the ones that are actually the same problem, and
turns validated clusters into startup build briefs.

Here's the build log, including the bug that almost broke the whole premise 🧵

2/
The idea: an AI-generated "startup idea" is a guess. But if the same
underlying problem shows up independently on Hacker News, in a GitHub
issue, and on a StackExchange question — worded completely differently
each time — that's real evidence, not a guess.

3/
So the pipeline:
→ poll 5+ complaint sources (HN, GitHub Issues, StackExchange, Codeberg,
Discourse, Mastodon, YouTube comments)
→ embed every complaint
→ cluster near-duplicates *across* sources
→ draft a brief from clusters that clear a signal threshold

4/
The bug: at 370 ingested signals, cross-platform clustering was returning
ZERO matches. Everything clustered fine within its own source. Nothing
ever matched across sources.

If HN and GitHub never agree, the whole "independently verified" pitch
falls apart.

5/
Root cause: embedding normalization + a similarity threshold that had
effectively been tuned on same-source pairs — it fell apart once
cross-community phrasing differences got folded in. [fill in your actual
fix / numbers here]

6/
Also just moved the ingest pipeline off a metered API by default. Ollama
handles classification, a self-hosted OmniRoute gateway handles draft
generation, OpenRouter is a fallback only. Pipeline can poll continuously
without a bill that scales with volume — matters a lot solo.

7/
Each validated cluster becomes an idea drop: the raw evidence (linked, not
summarized away), a signal count, and a brief written to paste straight
into Claude Code / Cursor / v0 / Bolt.

Live at https://www.getsourced.dev if you want to see it.

8/
Building this solo, sharing the real bugs as I hit them, not just the wins.
Follow along if that's your kind of thing.
