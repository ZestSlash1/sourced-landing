# Handoff Note

**Last updated by:** Codex
**Date:** 2026-10-14

## Current state
- Homepage redesigned locally from the user's request to take inspiration/components from obsidianui.dev. Prepared for a Vercel preview deployment from `codex/obsidian-homepage`; production `main` is unchanged.
  - `app/home-client.tsx`: split editorial hero, real sample-drop dossier, pipeline animation contained inside that preview, direct `/feed` CTA, numbered idea shelf, signal-to-brief showcase, refined sample/pricing/FAQ/newsletter sections.
  - `components/obsidian/`: adapted Discover Button and Split Showcase, with upstream MIT `LICENSE`. Uses existing Framer Motion, Next Link and vanilla CSS; no dependency changes.
  - `app/globals.css`: homepage styles scoped under `.sourced-home`. Uses the existing next/font variables correctly (literal font-family names previously fell back to serif), retains Space Grotesk / JetBrains Mono and violet. Other routes and global navigation retain their current styling.
  - Agent tabs support ArrowLeft/ArrowRight/Home/End, currency buttons expose selected state, signup input is labeled and readable on dark surfaces, focus/reduced-motion styles included.
  - Updated existing homepage integration assertion for the new components. Verification: 61 files / 279 tests pass; `npm run typecheck` passes; `npm run build` passes. Browser checked desktop, 390px and 320px mobile; tool tab clicks/keys, INR switching, signup form expansion and mobile navigation. No payment or signup submitted.
  - Local production preview: `npm run start -- --port 3000`. Do not run dev/build concurrently: both write `.next` and can corrupt the local output. An initial collision was corrected by stopping dev and rebuilding successfully.
- Repository baseline is `c357749` (latest public-apis snapshot synced from `origin/main`); latest committed work is the animated admin pipeline flow (`f7d1075`) and pipeline queue fix (`beb66da`). No backend or database changes in this session.
- Existing untracked user work preserved: `AGENTS.md`, `app/vortex-demo/`, `components/hero/vortex-field.tsx`, `tests/vortex-field.test.ts`, `hostname-rename-spec.md`, `new/`, `public/three.min.js`, `public/vortex-preview.html`, `sourced-tiered-clustering-implementation.md`, `test_dom.html`.

## In progress / next up
- Deploy the homepage as a Vercel preview from `codex/obsidian-homepage`. Production promotion requires a production-release request.
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