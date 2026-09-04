# Handoff Note

> Overwrite this file at the end of every session — whoever picks up next
> (human or agent) reads this before touching anything.

**Last updated by:** Antigravity / Gemini
**Date:** 2026-09-04

## Current state
- Homepage Layout Alignment & React Bits <DotField /> Integration:
  - Replaced legacy particle background with the interactive `<DotField />` component from React Bits (`components/DotField.jsx` + `DotField.css` + `DotField.d.ts`), creating the responsive dot grid motion with cursor bulging, dynamic engagement speed, and subtle violet radial glow.
  - Re-architected `.columns` from a CSS multi-column flow (`columns: 4 220px`) into a structured 3-column CSS Grid (`grid-template-columns: repeat(3, 1fr)` with 2-col and 1-col responsive breakpoints).
  - Fixed uneven card heights and staggered bottom edges: standardized card banner cover height to 58px across all 6 cards, enforced `min-height: 40px` on titles, and pinned card footers (`.idea-foot`) to the bottom with `margin-top: auto` for aligned baselines across rows.
  - Centered and balanced the CLI agent snippet panel (`.agent-snippet`) under the builder tabs.
- Live Visitor Globe UI Overhaul (`/admin/analytics`):
  - Fixed visual text and button collisions from overlapping absolute containers.
  - Relocated the live telemetry source tag (`source: live · getLiveAnalytics()`) into the header crumb bar.
  - Grouped rotation and arc controls with the drag/scroll hint into a unified flex footer (`.stageFooter`), eliminating collision on smaller viewports.
  - Converted the 4 KPI stat cards into a clean 2x2 HUD overlay with glassmorphism, backdrop-blur, and monospace micro-labels.
  - Converted sidebar tabs into a uniform 4-column CSS grid so all tabs (`Countries`, `Pages`, `Referrers`, `Devices`) fit neatly on a single line.
  - Unified color theme to Sourced's violet design language (`--arc: 124, 58, 237`) in both light and dark modes.
- 1-Click Database Schema Exporter (`schema.sql` & Prisma) shipped and live:
  - Generates production-ready PostgreSQL DDL (`lib/idea-drops/sql-schema-generator.ts`) from `buildBrief.dataModel` with UUID extension, foreign key constraints, indexes, Supabase Row-Level Security (RLS), auto-updated timestamp triggers, and realistic development seed records.
  - Also generates clean Prisma schema format (`schema.prisma`).
  - Added public API endpoint at `/api/ideas/[id]/schema` (`curl -s https://www.getsourced.dev/api/ideas/[slug]/schema > schema.sql` and `?format=prisma`).
  - Added 3rd tab, download button, and copy button in `BuilderExportPanel` on `/feed/[slug]`.
  - Covered by comprehensive unit tests (`lib/idea-drops/sql-schema-generator.test.ts`).
- 6 Live Published Drops on `getsourced.dev`:
  - `SentinelFlow AI` (cross-platform validated across YouTube, GitLab, HN), `Curated Developer News Digest Automator`, `AI Model Limit Tracker & Cost Monitor`, `VT-Fuzz`, `Client-ready P&L exports for solo bookkeepers`, and `Personal Social Read-Only Viewer (Post-Nitter)`.
- 1-Click Builder Export Suite live on `/feed/[slug]`:
  - Generates bespoke `CLAUDE.md`, `.cursorrules`, and `schema.sql` files for direct terminal consumption and 1-click downloads.
- Ingestion, Classification, and Clustering Pass completed:
  - Polled across 12 keyless sources (HN, GitHub, GitLab, YouTube, Codeberg, Discourse, Mastodon, DevRant), inserting 101 new raw signals into `raw_signals`.
  - Paginated PostgREST query in `lib/ingest/raw-signals-repository.ts` (`listUndraftedSignals`) in chunks of 1,000 to load all 2,250+ signals without truncation.
  - Batched `persistClusterKeys` into concurrent chunks of 10 requests, speeding up cluster key writes across the Cloudflare tunnel from minutes to seconds.
- Local Ollama Draft Generation Fallback & OmniRoute Resilience:
  - Native JSON draft generation via local Ollama (`lib/llm/providers/ollama.ts`) supporting `gemma3:4b` and `qwen2.5:7b-instruct` with grammar-constrained decoding.
  - Strict JSON extraction validation in `lib/llm/providers/omniroute.ts` with fallback to local Ollama.
- Admin panel, analytics, and auth fully stable:
  - Admin sign-in, session synchronization, `/admin/analytics` maxDuration=60, and parallel queries operational.
- Test suites: 30 test files (162 tests) passing in Vitest. Full Next.js production build (`npm run build`) and typecheck verified clean.

## In progress / next up
- Automated Newsletter & Drop Dispatcher: wire up weekly broadcast of newly published drops to `sourced_subscribers`.
- Execute Tier 1 from `sourced-off-page-seo-checklist.md` using drafts in `seo-drafts/` (Show HN, Dev.to, directory submissions).
- Set `BLUESKY_HANDLE` and `BLUESKY_APP_PASSWORD` in `.env.local` / Vercel env to activate live Bluesky searching.

## Watch out for
- Embeddings are 768 dimensions (`nomic-embed-text`).
- Cross-platform threshold remains 0.82 with 3+ signals across 2+ platforms.
- Supabase is shared with Mettel — stick to Sourced's own tables: `raw_signals`, `idea_drops`, `idea_drop_views`, `sourced_subscribers`, `subscriber_topics`, `events`, `admins`, `settings`, `sourced_newsletter_signups`.
- Product Hunt and Reddit are permanently ruled out — don't re-explore.
- `idea_drops` is a wide table with several jsonb columns (problem, evidence, build_brief, matched_apis, launch_stack, agent_prompts, difficulty, competitive_landscape) — check the real schema before writing migrations.

## How to update this file
When you finish a session: replace "Current state," "In progress," and
"Watch out for" with what's actually true now. Keep it short — this is a
status note, not a changelog. Git history is the changelog.
