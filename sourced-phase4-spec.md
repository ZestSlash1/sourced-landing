# Sourced — Phase 4 Spec: Automated Ingest + Accounts + Topic Feed

## Context
Phase 3 shipped real admin auth and a working admin dashboard, but `idea_drops` is still empty — every idea has to be authored by hand, and there's no customer-facing account system (only admin). This phase closes both gaps: ideas get sourced and drafted automatically, and real customers can sign up, pick topics, and see a feed gated by their actual subscription tier.

This also finally gives `resolveUserTier` something real to look up — it currently hard-locks everyone to "free" because there's no subscriber session. This phase adds that session. (Razorpay itself — actually taking payment and setting `subscribers.tier` — stays a separate follow-up phase, noted at the end.)

## Decisions made before building (flag if wrong)
1. **Ingest sources, v1:** Reddit (OAuth app, free tier), Hacker News (Algolia API, free/open), Stack Exchange API (free), GitHub Issues API (free). G2 and Upwork are dropped from automation — no clean free API, scraping risks ToS. They can stay as an occasional manual-add path via the existing admin form.
2. **Not fully blind auto-publish.** Fetch and draft are automated; publishing goes through a one-click approve step in the admin dashboard you already have. Protects the "proof of demand" promise the product is built on — an LLM drafting a quote that doesn't check out would undermine the whole thing.
3. **LLM drafting cost is real and needs a cap.** Each candidate complaint cluster costs an API call to draft into Sourced's format. Recommend a daily cap (e.g. 5–10 drafts/day) rather than uncapped — keeps cost predictable and keeps the pending queue reviewable in a couple of minutes a day rather than becoming its own chore.
4. **Topics are a fixed, curated list to start** (not free-text/user-generated) — e.g. "E-commerce", "Marketplaces (Etsy/Shopify/Amazon)", "Freelance & Client Tools", "Dev Tools", "Content/Creator Tools", "B2B SaaS/CRM". Curated keeps the ingest pipeline's classification step simple (one LLM call per idea can also assign topic(s) from this fixed list) and keeps the topic-picker UI simple. Can expand later.

---

## Part A — Automated Ingest Pipeline

### A1. Source pollers
One scheduled job per source (Vercel Cron, staggered so they don't all fire at once):
- **Reddit poller** — polls a fixed list of target subreddits (e.g. r/Etsyseller, r/shopify, r/smallbusiness, r/freelance, r/SaaS, r/webdev) via Reddit's OAuth API, pulling new posts + top comments above a minimum upvote threshold.
- **HN poller** — Algolia HN Search API, filtered for stories/comments matching pain-point phrasing ("wish there was", "does anyone know a tool", "I hate that").
- **Stack Exchange poller** — Stack Exchange API, filtered to relevant sites (e.g. Webmasters, Software Recommendations) for unanswered/low-answer questions describing a workflow gap.
- **GitHub Issues poller** — GitHub Issues API against a curated list of popular open-source repos in relevant categories, filtered for issues with "feature request" style language and multiple 👍 reactions.

Each poller writes raw candidates into a `raw_signals` table: source, url, text, engagement metric (upvotes/reactions/replies), fetched_at. Dedup on url.

### A2. Clustering / filtering
Before spending an LLM call, filter `raw_signals` for candidates worth drafting:
- Minimum engagement threshold (tunable per source)
- Not already linked to an existing `idea_drops` row (dedup check)
- Optional: group multiple raw_signals that describe the same underlying complaint (e.g. the three Etsy review-sort threads from different years) into one cluster — this is what makes the "proof of demand" section strong instead of single-source.

### A3. Draft generation
For each surviving cluster, one Claude API call (same shape as the manual process from Track A of this project) produces a draft `idea_drops` row in Sourced's existing format: problem statement, proof-of-demand summary (with real source URLs, not fabricated ones — the prompt must require the model to only cite URLs it was actually given in context, never invent one), target user, build brief, matched free APIs, $0 stack, suggested topic tag(s), suggested pricing tier gate.

Draft lands with `status = 'pending_review'`, not `'published'`.

### A4. Admin review queue
Extends the existing `/admin` dashboard with a pending-ideas view: each draft shown with its source links inline (so you can click through and eyeball the actual complaint in ~10 seconds), Approve / Edit / Reject buttons. Approve flips `status` to `'published'`. This is the one-click human check from Decision #2 above.

---

## Part B — Customer Accounts

### B1. Auth
Supabase Auth for regular customers (separate from the existing `admins` table / `requireAdmin()` guard — customers are not admins). Email/password or magic link, your call — magic link avoids password-reset support burden for a solo operator. **Add GitHub as an OAuth provider alongside whichever primary method you pick** — Supabase Auth supports GitHub out of the box, and it's a natural fit given the builder audience, plus it sets up the repo-linking needed for Part D below.

### B2. Subscriber record
Extends the `subscribers` table built in Phase 3: link each Supabase Auth user to a `subscribers` row. New user → `subscribers` row created with `tier = 'free'` by default. This is also exactly the table Razorpay will update later when someone pays.

### B3. Session-based tier lookup
Replaces the `resolveUserTier` stopgap: instead of hard-locking to `"free"`, look up the logged-in user's `subscribers.tier` from their session. Logged-out visitors still see `"free"` behavior. This closes the gap flagged at the end of Phase 3 — and it's now safe to do because there's a real subscriber record to look up instead of a spoofable query param.

### B4. Topic selection
On signup (or from account settings), user picks one or more topics from the fixed list in Decision #4. Stored as a `subscriber_topics` join table.

---

## Part C — Personalized, Tier-Gated Feed

### C1. Feed query
Replaces/extends whatever currently lists `idea_drops`: filter to `status = 'published'`, filter to the logged-in user's selected topics (logged-out/no-topics-selected users see everything, or a curated "popular across all topics" default — your call), order by newest first.

### C2. Tier gating on content, not just visibility
Every idea is visible to everyone (so free users see what they're missing and get a reason to upgrade), but the depth of what's shown depends on tier:
- **Free:** problem statement + proof-of-demand summary only
- **Builder:** + full build brief + matched free APIs + $0 stack
- **Studio:** + agent-specific formatted prompts (per the agent picker — Claude Code / Cursor / Windsurf / v0 / Bolt) + suggested pricing/positioning for the idea itself

This reuses the same `resolveUserTier` lookup from B3 — one gating function, checked wherever content is rendered.

---

---

## Part D — Builder Podium / Competition

### D1. Concept
Each week's (or month's) featured idea gets its own competition. Users who build a working solution against that idea submit their entry; the community upvotes; the top few are shown to you for final pick. Winners get podium placement on the site, a badge on their profile, and a free month of Studio tier (cheap for you, meaningful to them — no cash-prize logistics needed).

### D2. Submission
A submission is a live URL + a linked GitHub repo, not a screenshot or a claim. Requires GitHub OAuth (Part B1) so the repo link can be verified as belonging to the submitting account.

### D3. Auto-populated submission card (via GitHub API)
On submission, fetch from the linked repo automatically: stars, primary language, README excerpt, first-commit date, commit count. No manual form beyond pasting the repo URL.

### D4. Soft authenticity signal
Flag (for your review, not auto-reject) any submission where the repo's first commit predates the idea's publish date, or has fewer than ~3 commits — cheap heuristic against low-effort/fake entries.

### D5. Scaffold-to-build (stretch goal, not required for v1)
A "Scaffold this" button on an idea page that creates a starter repo for the logged-in user (via GitHub's template-repo API) mirroring the build brief's structure — lowers the friction between reading an idea and actually starting on it, and gives you a natural funnel into D2 since the scaffolded repo is already linked to their account.

### D6. Status via webhook (stretch goal)
A GitHub webhook on a linked submission repo can auto-flip status between "building" and "shipped" on a qualifying push, instead of the user manually updating it.

### D7. Data model
- `competitions`: idea_id, opens_at, closes_at, status
- `submissions`: competition_id, subscriber_id, repo_url, live_url, stars/commit metadata (cached from GitHub, refreshed periodically), upvote_count, status
- `submission_votes`: submission_id, subscriber_id (one vote per logged-in user per submission)

---

## Sequencing recommendation
1. Part A (ingest) can be built and tested independently — it just needs `idea_drops` to write into, which already exists. This is the fastest way to get the "empty idea_drops" problem solved and prove the pipeline end to end.
2. Part B (accounts) can follow in parallel or right after — it doesn't depend on Part A.
3. Part C (feed) needs both A (content to show) and B (someone to gate it for) done first.
4. Part D (podium) needs B (accounts + GitHub OAuth) done first, and benefits from A/C already running so there's a real weekly idea to compete on. Treat D as a follow-on phase once A–C are live, not a same-sprint addition — it's the most product-complexity-heavy part (voting, GitHub API usage, submission review) and doesn't need to block getting the core loop (ideas → accounts → gated feed) working first.
5. **Razorpay** (separate phase, not in this spec): once B3's real tier lookup exists, Razorpay just needs to update `subscribers.tier` on successful payment/webhook — the rest of the gating logic is already built by the time you get there.

## Open questions for you before this goes to Claude Code
- Magic link vs password (+ GitHub OAuth) for customer auth?
- Daily LLM-draft cap — does 5–10/day sound right, or do you want it lower to start while you dial in prompt quality?
- Logged-out feed default: show everything, or a curated subset?
- Podium reward: free Studio month as proposed, or something else? And weekly vs monthly competition cadence?
