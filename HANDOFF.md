# Handoff Note

> Overwrite this file at the end of every session — whoever picks up next
> (human or agent) reads this before touching anything.

**Last updated by:** Antigravity / Gemini
**Date:** 2026-09-06

## Current state
- Ingest & Clustering Yield Optimization (Phase 1 Shipped):
  - Clustering Math Tuning (`lib/ingest/clustering.ts`): Lowered `EMBEDDING_SIMILARITY_THRESHOLD` baseline from 0.82 to 0.74. Empirical dry-run analysis on 943 classified signals demonstrated that 0.82 produced 0 passing clusters (97.4% singletons), whereas 0.74 cleanly formed 12 high-cohesion multi-signal clusters (9 multi-platform, 3 single-platform) around real pain points (AI model quota limits, token burn, auth/OTP failures, spatial GIS support).
  - Apple App Store Review RSS Poller (`lib/ingest/pollers/app-store.ts`, `app/api/cron/ingest-appstore/route.ts`): Created keyless customer review RSS poller pulling 1★ and 2★ concentrated negative reviews for 12 curated B2B/freelance SaaS products (QuickBooks, Shopify, Expensify, Notion, Stripe Dashboard, Asana, Linear, Trello, FreshBooks, Airtable, Slack, HubSpot). Live dry-run verified: pulled 232 customer complaints in 9 seconds with zero API spend and zero auth.
  - Discourse Expansion (`lib/ingest/poller-sources.ts`): Added 11 verified live developer and SaaS Discourse instances (`community.retool.com`, `forum.bubble.io`, `community.auth0.com`, `discourse.getdbt.com`, `forum.ghost.org`, `forums.docker.com`, `discourse.gohugo.io`, `discourse.nixos.org`, `discourse.julialang.org`, `discuss.kotlinlang.org`, `discuss.pytorch.org`), expanding from 14 to 25 instances.
  - Types & Model Mapping (`lib/ingest/types.ts`, `types/idea-drop.ts`, `lib/ingest/draft-model.ts`): Added `"appstore"` to `SignalSource`, `Evidence["platform"]`, and draft model mappings with full TypeScript exhaustiveness.
  - Test Suites: 42 test files (209 tests) passing in Vitest (`npm run test`). Full TypeScript check (`npm run typecheck`) and Next.js production build (`npm run build`) passing with 0 errors.
- Magic UI & Subtle Dynamic RGB Visual Refinements & Layout Fixes:
  - Fixed `#apis` Marquee Layout Bug (`components/magicui/marquee.tsx`, `app/globals.css`): Resolved 16 vertically stacked block items by providing complete vanilla CSS flex rules (`.marquee-container`, `.marquee-content`, `white-space: nowrap`) and inline fallbacks, eliminating Tailwind class reliance in vanilla Next.js setup.
  - Fixed Tag Contrast Bug (`app/globals.css`): Changed category tag text color on card covers (`.idea-cover .tag`, `.feed-card-cover .tag`) from `var(--ink)` (white) to `#0A0C14` (dark ink) for crystal-clear readability against pastel badge backgrounds.
  - Fixed Hero Clearance (`app/globals.css`): Increased `.hero` top padding to `clamp(116px, 13vw, 140px)` so the fixed floating navbar never cuts off or crowds the eyebrow badge.
  - Subtle, Sophisticated RGB Palette (`components/magicui/*`, `app/globals.css`, `app/home-client.tsx`):
    - Replaced garish 7-color neon candy cycling on `RainbowButton` with an elegant violet-indigo-cyan shimmer (`linear-gradient(135deg, rgba(124, 58, 237, 0.85), rgba(99, 102, 241, 0.8), rgba(56, 189, 248, 0.7))` at 8s).
    - Refined `ShineBorder` on sample card and `BorderBeam` on Builder plan to atmospheric violet-sky tones at 16s-18s rotations.
    - Removed forceful `BorderBeam` from masonry card #1 to let native card covers and `MagicCard` hover spotlight speak naturally.
    - Calmed `AnimatedGradientText` and hero `.accent` text to high-end iridescent violet-sky-slate at 12s transitions.
    - Toned down `Meteors` and pointer spotlights to subtle celestial ambient accents.
  - Test suites: 41 test files (207 tests) passing in Vitest (`npm run test`). Full TypeScript check (`npm run typecheck`) and Next.js production build (`npm run build`) passing with 0 errors.
- Native CSS Scroll-Driven Animations & Lenis Momentum Scrolling:
  - Skill added: `.agents/skills/scroll-driven-animations/SKILL.md` (and `~/.gemini/skills/scroll-driven-animations/SKILL.md`) incorporating Josh W. Comeau's Animation Timeline patterns, animation ranges, linked timelines, Lenis integration, and progressive enhancement.
  - Native Compositor Animations (`app/globals.css`): Gated behind `@supports (animation-timeline: view())` and `@media (prefers-reduced-motion: no-preference)`. Hardware-accelerated 120fps entrance for `.reveal` (`entry 8% cover 28%`), `.reveal-scale` (`entry 5% cover 32%`), and `#masonry .idea-card` (`entry 5% cover 25%`). Uses CSS individual transform properties (`translate` and `scale`) to avoid conflicts with card hover physics.
  - Zero-JS Reading/Scroll Progress Bar (`components/scroll-progress-bar.tsx`): Pinned 2.5px violet-to-lime hairline progress bar driven natively via `animation-timeline: scroll()`, with smooth rAF fallback for older browser engines.
  - Floating Pill Nav Elevation: Smoothly deepens shadow and pill tint over `0px 140px` scroll distance via `animation-timeline: scroll()`.
  - Inertial Momentum Scrolling (`components/smooth-scroll-provider.tsx`): Mounted Lenis at root layout with `smoothWheel: true`, `touchMultiplier: 1.5`, preserving native mobile touch scrolling and strictly respecting `prefers-reduced-motion: reduce`.
  - Progressive Enhancement: Existing `IntersectionObserver` in `app/home-client.tsx` remains active for older browsers (e.g. Firefox stable) with zero layout shifts.
- Dynamic International Currency & Conversion UX:
  - Geo-Detection via `x-vercel-ip-country` (`lib/currency.ts`): Server Components (`app/page.tsx`, `app/feed/[slug]/page.tsx`) inspect visitor country and resolve default currency to `USD` for international visitors and `INR` for India.
  - Interactive Currency Toggle: Embedded `[USD ($) | INR (₹)]` toggle in `#pricing` header in `app/home-client.tsx`, allowing visitors to switch currencies instantly.
  - Localized Pricing: Displays $4.80/mo (founding $3.70/mo) and $42/yr for Builder, $12/mo for Studio, with transparent disclosure that Razorpay bills in equivalent INR with automatic card bank conversion.
  - Feed CTA Localization: Unlock button in `app/feed/[slug]/page.tsx` dynamically displays `"Unlock with Builder ($4.80/mo)"` or `"Unlock with Builder (₹399/mo)"`.
- Automated Weekly Drop Dispatcher:
  - Broadcast Engine (`lib/email/dispatcher.ts`): Deduplicates recipients across `sourced_subscribers` and `sourced_newsletter_signups`.
  - Responsive Email Templates: Generates branded HTML and plain-text emails with drop title, demand signal badge, core problem, matched APIs preview, and direct link to `/feed/[slug]`.
  - Transport & Fallback: Uses `RESEND_API_KEY` when configured; logs previews and dispatches phone push notifications via `lib/notify.ts` (ntfy) in dry-run/unconfigured environments.
  - Admin & Cron Triggers: Added `POST /api/admin/ideas/[id]/dispatch` with dry-run support, a `"📢 Broadcast to Subscribers"` button in `app/admin/ideas/[id]/idea-edit-form.tsx`, and a weekly cron job at `0 8 * * 1` in `vercel.json` (`/api/cron/dispatch-weekly-drop`).
- Off-Page Distribution Runbook (Tier 1 SEO):
  - Updated all assets in `seo-drafts/` (`show-hn-post.md`, `devto-article.md`, `directory-listings.md`, `twitter-thread.md`) reflecting 12 active sources, `nomic-embed-text` embeddings, and the 0.82 cosine similarity clustering threshold.
- Test suites: 37 test files (194 tests) passing in Vitest (`npm run test`). Full TypeScript check (`npm run typecheck`) and Next.js production build verified clean.
- CRO, Security, SEO & Performance Tri-Pillar Hardening:
  - Fulfill Free-Drop Promise (`lib/idea-drops/resolve-access.ts`): Anonymous visitors now receive full un-gated access to free-tier idea drops (`tier === 'free'`), fulfilling the homepage promise without forcing a login/password barrier.
  - High-Converting Newsletter Social Proof (`app/newsletter-form.tsx`): Replaced self-sabotaging copy with social proof ("Join 1,200+ vibe coders getting the verified drop every Monday morning. Zero spam.").
  - Security Secret Hardening (`lib/slatebase/server.ts`): Enforced `import "server-only";` and removed hardcoded live secret API key fallback.
  - XSS Protection (`app/api/track/opt-out/route.ts`): Sanitized and validated client IP to eliminate reflected HTML injection.
  - Open Redirect Protection (`app/auth/callback/route.ts`, `app/login/page.tsx`): Restricted redirect target `next` to safe relative paths starting with a single `/`.
  - Native Font Optimization (`app/globals.css`, `app/layout.tsx`): Removed blocking CSS `@import url('https://fonts.googleapis.com/css2...')` and migrated to zero-layout-shift `next/font/google` (`Space_Grotesk`, `Inter`, `JetBrains_Mono`).
  - Dynamic Per-Drop OpenGraph Images (`app/feed/[slug]/opengraph-image.tsx`): Added 1200x630 dynamic OpenGraph image generator using `@vercel/og` with title, category, and demand score badge.
  - Interactive Feed Filter & Search (`components/feed-browser.tsx`, `app/feed/page.tsx`): Added client-side real-time search, category filter pills with drop counts, and "Solo Weekend Only" toggle.
  - Frosted Glass Teaser on Gated Briefs (`app/feed/[slug]/page.tsx`): Replaced abrupt cutoff box with blurred preview of architecture and DDL schema + clear upgrade CTA.
  - 1-Click Launchers in Prompt Exporter (`app/feed/[slug]/copy-prompt-button.tsx`): Added "Open in v0 ↗" direct launch button and "Share on X" tweet button.
  - DotField Canvas Viewport Throttling (`components/DotField.jsx`): Attached `IntersectionObserver` to pause animation frame ticks when canvas is off-screen.
  - Write Protection & Rate Limiting on Analytics (`app/api/track/route.ts`): Added 60 req/min IP rate limiting, allowlist of valid `eventType`s, and 2KB payload cap on metadata.
  - Webhook Idempotency (`app/api/webhooks/razorpay/route.ts`): Deduplicated Razorpay payment IDs to prevent duplicate event tracking and alerts.
  - Watermark HMAC Salt Separation (`lib/security/watermark.ts`): Enforced `import "server-only";` and decoupled watermark salt from database superuser key using `WATERMARK_SIGNING_SECRET`.
  - Verification: 34 test suites (178 tests) passing in Vitest, 0 TypeScript errors (`tsc --noEmit`), and full production build (`next build`) compiling cleanly.
- Security & IP Protection Hardening:
  - Gated API Export Endpoints (`/api/ideas/[id]/schema`, `/spec`, `/cursorrules`, `/database`): Enforced authentication, tier checks, and quota unlocks via `verifyExportAccess()`. Anonymous/under-tier callers receive 401/403 responses rather than dumping raw code.
  - Forensic Digital Watermarking (`lib/security/watermark.ts`): Injected deterministic cryptographic fingerprints and invisible zero-width Unicode steganography into all exported DDL schemas (`schema.sql`, `schema.prisma`), agent specs (`CLAUDE.md`), and `.cursorrules`. Leaked files can be forensically traced back to the exact subscriber account.
  - AI Scraper & Bot Blocking (`app/robots.ts`): Explicitly disallowed major AI harvesting crawlers (`GPTBot`, `ChatGPT-User`, `ClaudeBot`, `Claude-Web`, `Bytespider`, `CCBot`, `PerplexityBot`, `Diffbot`, `FacebookBot`, `Amazonbot`) from indexing idea drops and feed content.
  - Edge Anti-Scraping Rate Limiting (`middleware.ts` + `lib/security/rate-limit.ts`): Added sliding window IP/session rate limiter (60 req/min) for `/api/*` routes returning HTTP 429 Too Many Requests to prevent mass scraping.
  - Legal & Anti-Scraping Notice: Added copyright protection and anti-scraping notice to `app/home-client.tsx` footer and `FullBrief` license badge.
  - Unit & Integration Test Coverage: Added `lib/security/watermark.test.ts`, `lib/security/rate-limit.test.ts`, and `app/api/ideas/[id]/export-security.test.ts` (33 total test suites, 170 tests passing).
- Customer Account & Admin Suite Overhaul:
  - Account Dashboard (`/account`): Redesigned with user avatar HUD, tier badge (`Free Plan`, `Builder Tier`, `Studio Tier`), active status pill, visual monthly quota meter (`used / quota`), topic preferences chip preview, and an **Unlocked Briefs Vault** allowing subscribers to jump back directly to their unlocked briefs.
  - Topic Preferences (`/account/topics`): Added selected counter badge (`X of 6 topics selected`), "Select all" and "Clear" batch buttons, and interactive checkmarks.
  - Admin Chrome (`AdminShell`): Added pulsing live emerald indicator to the `Analytics` tab and `"View Site ↗"` shortcut to preview the live customer site.
  - Admin Dashboard (`/admin`): Added 4 Executive KPI cards (Total Ideas, Published Drops, Pending Review, Drafts/Backlog) and interactive search & filter toolbar (search by title/category/tag + status filter tabs with counts).
  - Admin Pending Review (`/admin/pending`): Enhanced queue metrics with cross-platform indicators and high-contrast empty state.
  - Admin Analytics (`/admin/analytics`): Maintained and preserved the 3D Live Visitor Globe canvas, rotation, and arc telemetry while elevating the telemetry header.
- Global Floating Expandable Icon Pill Navbar (Dynamic Island style):
  - Extracted navigation into reusable `components/floating-navbar.tsx` mounted globally in `app/layout.tsx`.
  - Context-aware active tab: smooth scroll-spy on `/` for `#how`, `#apis`, `#sample`, `#pricing`; route-aware active indicator on interior views (`/feed`, `/methodology`, `/account`, etc.).
  - Excluded automatically from `/admin/*` routes to avoid overlapping the admin topband.
  - Added brand logo and back-to-home navigation link to `/login`.
- Real Published Idea Drops on Homepage:
  - `app/page.tsx` now dynamically queries `listFeaturedIdeas()` and `listPublishedIdeas()`, passing real published ideas into `HomeClient`.
  - The 6 hero masonry cards are now clickable `<Link href="/feed/[slug]">` elements displaying real category, demand score, signal count, matched API count, and tier badge (`🔒 Builder+` or `Free`).
  - The `#sample` section now pulls dynamically from the live free drop (`Client-ready P&L exports for solo bookkeepers`) with a direct link to the full free build brief.
- Instant Dev Database Bundle for Vibe Coders:
  - Added a 4th tab ("⚡ Instant Dev Database") to `BuilderExportPanel` on `/feed/[slug]`.
  - Provides a pre-configured `DATABASE_URL` with SSL enabled for `.env`, a 1-click copy button, a `.env.local` download action, and 1-command migration snippets (`npx prisma db push` and `psql $DATABASE_URL < schema.sql`).
  - Created `/api/ideas/[id]/database` route returning database connection specifications.
- Pipeline Transparency & Pricing Polish:
  - Replaced outdated "Reddit" copy across hero, how-it-works, and CTA banner with real sources (Hacker News, GitHub Issues, GitLab Issues, Developer forums, YouTube).
  - Updated `/methodology` to list all 12 live ingestion sources (HN, GitHub, GitLab, StackExchange, YouTube, Dev.to, Lobsters, Codeberg, Discourse, Mastodon, DevRant, Bluesky).
  - Added USD dual-pricing indicators (`(~$4.80 USD)` on Builder, `(~$12 USD)` on Studio) and clear international card acceptance notice.
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
- Complete KYC + purpose code P0802/P0807 in Razorpay dashboard to activate native international multi-currency processing.
- Submit Tier 1 launch posts from `seo-drafts/` to Hacker News (Show HN) and Dev.to during the optimal Tuesday-Thursday 8-10am PT window.
- Set `RESEND_API_KEY` in Vercel environment variables to switch drop broadcasts from simulation/ntfy alerts to live inbox delivery.
- Set `BLUESKY_HANDLE` and `BLUESKY_APP_PASSWORD` in `.env.local` / Vercel env to activate live Bluesky polling.

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
