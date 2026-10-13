# Handoff Note

**Last updated by:** Codex
**Date:** 2026-10-14

## Current state
- Research improvements prepared in the attached worktree `C:/Users/falcon/.codex/worktrees/research-release/sourced-nextjs`, branch `codex/research-release`, based on `efae59b`. Production release explicitly authorized by the user. Original checkout has another active homepage chat; its work and unrelated untracked vortex/new/demo/spec files were preserved and excluded from this release.
- Homepage now leads to the complete free historical walkthrough at `/#sample` (`components/research-sample.tsx`): specific Prisma issue links and original dates, source checks on 14 October 2026, current alternatives, narrow proposed MVP, cuts, validation decision rules and copyable coding prompt. Explicitly outside the 90-day new-drop freshness bar; no fabricated fresh evidence, interviews, purchases or pipeline rejection records. No published idea rows or schema were changed.
- Added account shortlist through `PUT /api/account/watchlist`, detail-page save/remove, and Account evidence-change indicators. Uses Sourced's existing `events` table, `event_type=opportunity_watch`, one deterministic UUID per authenticated user/idea. Metadata: ideaId, evidenceFingerprint, reviewedAt. These rows are durable account state: future analytics retention must preserve them. Ordering, exact duplicates and tracking parameters do not cause false alerts. Comparison covers revised published evidence only; no automatic source checks or email alerts are claimed.
- Briefs show original dates, distinct/repeated URL counts, uncertainty about independent buyers, and automated alternatives' limitations. Research scores are described as internal ranks, not demand probabilities. Homepage client props contain summaries only, rather than full paid briefs.
- Removed fake instant database credentials/hosting UI. Working spec/schema downloads remain. Database endpoint uses read-only entitlement checks and returns 503 for eligible users, 401/403 otherwise; no quota is spent. Studio markets actual unlimited access and exports and discloses unavailable custom research, turnaround, revisions, hosting and early delivery. Razorpay checkout logic and plan IDs are unchanged (Builder ₹399, Studio ₹999; founding and annual behavior preserved). USD display is approximate and international activation remains pending.
- Free CTA uses the real account login flow. Removed invented fallback idea cards/counts, unverified newsletter subscriber count and unsupported demand-validation claims in the changed flow.
- Verification: 56 tracked test files / 236 tests pass in the isolated release; the larger shared-checkout count included untracked/duplicate tests. Typecheck and production build pass. Real Supabase events persistence, duplicate upsert, readback, comparison and deletion passed with a temporary QA event, then cleanup verified. Browser checks pass desktop, 390px and 320px: sample navigation, public source dates, INR display, checkout auth redirect, shortlist login return, anonymous/cross-site rejection, no placeholder credentials or uncaught JS errors. No payment, newsletter email or authenticated browser session was submitted. QA artifacts: `C:/Users/falcon/.codex/visualizations/2026/10/13/01a1370a-b3a1-7dc2-9a61-2d563841c1d3`.
- Existing published briefs still include broad/mixed clusters and weak automated alternatives. A separate content audit and real customer validation remain necessary. MiroFish findings are six fictional personas/two rounds of qualitative synthetic feedback, not willingness-to-pay evidence.
- Prior homepage work: Obsidian UI redesign committed as `efae59b`; Vercel production deployment `dpl_3Aaj9CC4iSVFygt7AbdmeD27ViX1` was READY when inspected during this release. The following bullets describe that inherited design.
  - `app/home-client.tsx`: split editorial hero, real sample-drop dossier, pipeline animation contained inside that preview, direct `/feed` CTA, numbered idea shelf, signal-to-brief showcase, refined sample/pricing/FAQ/newsletter sections.
  - `components/obsidian/`: adapted Discover Button and Split Showcase, with upstream MIT `LICENSE`. Uses existing Framer Motion, Next Link and vanilla CSS; no dependency changes.
  - `app/globals.css`: homepage styles scoped under `.sourced-home`. Uses the existing next/font variables correctly (literal font-family names previously fell back to serif), retains Space Grotesk / JetBrains Mono and violet. Other routes and global navigation retain their current styling.
  - Agent tabs support ArrowLeft/ArrowRight/Home/End, currency buttons expose selected state, signup input is labeled and readable on dark surfaces, focus/reduced-motion styles included.
  - Updated existing homepage integration assertion for the new components. Verification: 61 files / 279 tests pass; `npm run typecheck` passes; `npm run build` passes. Browser checked desktop, 390px and 320px mobile; tool tab clicks/keys, INR switching, signup form expansion and mobile navigation. No payment or signup submitted.
  - Local production preview: `npm run start -- --port 3000`. Do not run dev/build concurrently: both write `.next` and can corrupt the local output. An initial collision was corrected by stopping dev and rebuilding successfully.
- Release base is `efae59b`, including the public-apis snapshot `c357749`, animated admin pipeline flow (`f7d1075`) and queue fix (`beb66da`). No pipeline thresholds, Mettel tables or billing settings changed in the research release.
- Existing untracked user work preserved: `AGENTS.md`, `app/vortex-demo/`, `components/hero/vortex-field.tsx`, `tests/vortex-field.test.ts`, `hostname-rename-spec.md`, `new/`, `public/three.min.js`, `public/vortex-preview.html`, `sourced-tiered-clustering-implementation.md`, `test_dom.html`.

## In progress / next up
- Final browser confirmation and authorized production release pending; replace this line with verified status after completion.
- Pipeline follow-ups carried forward from the prior handoff (not reverified this session):
  - Drafts on Vercel enqueue `pipeline_jobs`; keep `npm run worker` running on falcon. Migration 0034 was reported applied live, as was 0033 for App Store signal support.
  - OmniRoute requires `OMNIROUTE_API_KEY`; prior drafts fell back to gemma3:4b and need human review. OpenRouter had no credits.
  - Worker orphaned-job recovery policy remains TODO in `scripts/pipeline-worker.ts`; a crashed job left `running` can block deduplicated enqueues.
  - Tiered-clustering migration 0032 was reported applied live despite stale contradictory text in the old handoff. Flag remains off by default. Qwen arbiter dry run produced 84 groups / 39 passing, with ~11% truncation/parse failures. Spot-check groups before enabling; consider cap/group-size changes only after investigation.
  - `OLLAMA_ARBITER_MODEL=qwen2.5:7b-instruct` was set locally; production configuration still needs checking before any tiered rollout. Draft-prompt sanitization follow-up remains open.
- Razorpay international currency activation needs KYC/purpose code P0802/P0807. Existing marketing copy mentions international acceptance; activation was not checked or changed here.
- Resend, Bluesky and YouTube environment configuration / launch-post submissions remain prior-session follow-ups.

## Watch out for
- Supabase is shared with Mettel. Only touch Sourced-owned tables; never change Mettel tables without explicit confirmation. `pipeline_jobs` is Sourced-owned per the previously applied queue migration.
- `idea_drops` contains jsonb `problem`, `evidence`, `build_brief`, `matched_apis`, `launch_stack`, `agent_prompts`, `difficulty`, `competitive_landscape`. Verify the real live column list before schema work; this is not a complete schema inventory.
- Embeddings are 768-dimensional nomic-embed-text. OpenRouter embeddings are a different vector space.
- Do not change deliberately tuned clustering thresholds without discussion. The prior verified values were 0.74 / 3 signals / 1 platform for the normal path and 0.82/0.55 for the flag-gated tiered path; check actual code before citing or changing them.
- Reddit, Product Hunt and Hashnode remain ruled out as ingestion sources.
- Older history and security/export work are in Git history; gated exports and tenant isolation must remain intact.
