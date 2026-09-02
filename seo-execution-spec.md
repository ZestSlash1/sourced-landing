# Sourced — SEO Execution Spec

## Context

getsourced.dev currently has ~3 indexed pages. Every brief already carries
structured attributes (category, source platform, matched APIs, suggested
stack) that can become real index surface, not doorway spam — the content
already exists in the DB, it's just not exposed as crawlable pages yet.

With the pgvector migration done and poller expansion landing (or about to),
signal and brief volume is growing, which makes this a good moment to build
the SEO surface that scales with that content rather than doing it once
volume is already large and harder to backfill cleanly.

This spec covers only what's buildable/scriptable now (code + on-page SEO).
Off-page work (backlink submissions, guest posts, podcast outreach) is
listed at the end as a manual checklist — not something to hand a coding
agent, but included so nothing from the roadmap gets lost.

## Goal

Turn getsourced.dev's existing data into hundreds of legitimate, content-rich
index pages; fix the current orphan-page interlinking problem; add schema
markup for rich results; and produce a durable long-tail content surface
(`/signals`) that grows automatically as the pipeline ingests.

## Non-goals

- Paid SEO tools/audits (Ahrefs, SEMrush) — use Google Search Console
  (free) for tracking in this pass
- Content marketing (blog posts, guest posts) — flagged in the manual
  checklist at the end, not part of the coding spec
- Redesigning the visual design of brief pages — this is about structure,
  metadata, and internal linking, not a redesign
- Changing what data pipeline stages produce — this spec only exposes
  existing data (category, source platform, matched APIs, stack) as pages;
  it doesn't ask pipeline stages to generate new fields

## Part 1 — Programmatic pages

### 1.1 — Category pages: `/category/[category]`

Every brief has a `domain` field (from classification — "Dev Tools",
"E-commerce", "B2B SaaS/CRM", etc.). Generate one static/ISR page per
distinct domain value that has at least 1 published brief.

Page contents:
- H1: "{Category} SaaS Ideas — Validated from Real Developer Complaints"
  (adjust copy to match existing site voice/tone)
- Short intro paragraph (can be a template with the category name
  interpolated, doesn't need to be unique per category — one well-written
  template paragraph is fine)
- Grid/list of all published briefs in that category, most recent first
- Pagination if a category exceeds ~20 briefs
- Link to `/category` index page listing all categories

Route: `app/category/[category]/page.tsx` (adjust to actual Next.js
version/router convention already in use — confirm app router vs pages
router from the existing codebase before assuming).

### 1.2 — Platform pages: `/platform/[platform]`

Same pattern, keyed on `raw_signals.source` (`github`, `gitlab`,
`stackexchange`, and the newly-added `youtube`, `codeberg`, `discourse`,
`mastodon` once poller expansion lands). One page per platform, listing
briefs whose evidence includes at least one signal from that platform.

H1: "SaaS Ideas Sourced from {Platform} — Real Developer Pain Points"

### 1.3 — Stack pages: `/stack/[technology]`

Keyed on whatever field stores the suggested tech stack per brief (confirm
exact field name — likely something like `suggested_stack` or parsed out of
the draft's stored JSON). One page per distinct technology mentioned across
briefs (Next.js, Supabase, FastAPI, etc.).

H1: "SaaS Ideas Built with {Technology}"

This one has the weakest SEO intent match (people don't usually search "SaaS
ideas built with Next.js") but strong internal-linking value — it's a good
hub page. Lower priority than 1.1/1.2 if implementation time is limited.

### 1.4 — API pages: `/api/[matched-api]`

If the brief data includes matched/suggested third-party APIs (Stripe,
Twilio, OpenAI, etc. — check whether this field already exists from draft
generation output, per the roadmap item "matched APIs count" used for
difficulty tagging), generate one page per API.

H1: "SaaS Ideas Using the {API} API"

This has decent search intent — people do search "[API name] SaaS idea" or
"[API name] project ideas" — genuinely useful long-tail surface.

### Shared requirements across 1.1–1.4

- Use ISR (Incremental Static Regeneration) with a 24h revalidate, matching
  the roadmap's P2 note on this — static-first is fine, freshness doesn't
  need to be real-time for these listing pages
- Each page needs a proper `<title>`, meta description, and canonical URL
  (avoid duplicate-content issues if a brief appears on multiple listing
  pages — canonical should point at each listing page itself, not back to
  the brief, since they're legitimately different pages with different content)
- Generate a sitemap entry for every generated page (see Part 4)
- Do NOT generate a page for a category/platform/stack/API value with zero
  associated published briefs — empty pages are exactly the "doorway page"
  pattern Google penalizes. Only generate where there's real content.

## Part 2 — `/signals` firehose

A new page (or paginated page set) at `/signals` listing raw ingested
signals — title, source platform, link, timestamp — regardless of whether
they've been classified as a complaint, clustered, or turned into a brief
yet.

### Purpose

This is explicitly the "raw material" transparency page from the roadmap —
massive long-tail surface (potentially thousands of entries as poller
expansion lands), refreshes daily, and it's an honest artifact: it's showing
visitors the actual pipeline input, not curated marketing copy.

### Implementation

- Route: `app/signals/page.tsx`, paginated (25-50 per page), most recent
  first
- Each row: title (linked to the original source URL, not an internal
  page — this is raw material, not a Sourced-authored page), source
  platform badge, relative timestamp
- Add a short explainer at the top: what this page is, link to
  `/methodology` for context
- No LLM-generated content on this page — it's a direct listing of ingested
  data, keeps it cheap to generate and legitimately different from the
  curated `/briefs` content
- Consider a lightweight per-signal detail state (complaint: yes/no/pending,
  if already classified) as a visual badge — reinforces the "we're
  transparent about our process" angle without extra dev cost, since
  `classified_as_complaint` already exists on the row

### SEO value

Each signal's title + platform is genuinely unique, indexable content
that updates daily — this is the single highest-volume, lowest-effort
long-tail surface available given the data you already have.

## Part 3 — Interlinking fix

Currently brief pages are orphans (per the roadmap note). Every brief page
needs to link to:

- Its category page (`/category/[category]`)
- Its platform page(s) (`/platform/[platform]`, one link per platform if the
  brief's evidence spans multiple)
- 2-3 related/sibling briefs — implement via a simple query: same category,
  excluding the current brief, most recent 2-3. Does not need embedding
  similarity for this — a shared-category lookup is sufficient and cheap.
  (If embedding-based "truly similar" related briefs is wanted later,
  that's a natural extension once pgvector is live — flag as a possible
  follow-up, not required now.)
- Related rejected clusters if the brief's category overlaps with any
  rejected clusters, linking to wherever `/rejected` content lives (if a
  per-category rejected view doesn't exist yet, this can be a simple filter
  on the existing `/rejected` page — check what's already built there)

Implementation: add an "In this category" and "Related ideas" section to
the existing brief page template — this is a template edit, not a new
route.

## Part 4 — Technical SEO

### 4.1 — Sitemap

Generate `sitemap.xml` dynamically (Next.js supports this natively via
`app/sitemap.ts` in the app router) covering:
- All published brief pages
- All category/platform/stack/API pages generated in Part 1
- The `/signals` paginated set (or at minimum the first page — decide
  whether deep pagination pages are worth including; typically only the
  first 1-2 pages of a paginated set are worth indexing, avoid submitting
  hundreds of thin pagination pages)
- Static pages (`/methodology`, `/pricing`, `/rejected`, etc.)

Submit the sitemap URL in Google Search Console once live.

### 4.2 — Schema markup

- **FAQ schema** on `/methodology` and `/pricing` — if these pages already
  have FAQ-shaped content, wrap it in `FAQPage` JSON-LD. If they don't have
  FAQ-shaped content yet, that's a content addition, not just markup — flag
  to whoever owns copy, don't fabricate fake FAQs just to have schema.
- **HowTo schema** on brief pages — the brief's build steps (if the draft
  output includes a structured step sequence) map naturally to `HowTo`
  JSON-LD. Check the draft generation output shape (from the OmniRoute spec)
  for whether steps are already structured enough to map directly, or need
  a light transform.
- **BreadcrumbList schema** site-wide — Home > Category > Brief, using
  whatever breadcrumb UI already exists or adding a simple one if it
  doesn't (breadcrumbs are also a genuine UX win for the interlinking fix
  in Part 3, not just an SEO nicety).

Use `next-seo` or hand-rolled JSON-LD `<script type="application/ld+json">`
tags — match whatever SEO tooling convention (if any) already exists in the
codebase; don't introduce a new library if meta tags are already handled
some other way.

### 4.3 — Meta tags audit

Confirm every page type (brief, category, platform, stack, API, signals,
static pages) has: unique `<title>` (not a site-wide template repeated
verbatim), unique meta description, Open Graph tags (title, description,
image if available), canonical URL.

## Part 5 — Manual / off-page checklist (not code, for the record)

These don't need a coding agent — listing them here so the roadmap item
isn't lost, to be done directly by you:

- Submit to: SaaSHub, AlternativeTo, BetaList, Startup Stash, IndieHackers
  products, Uneed, Fazier, Peerlist, Toolify, Futurepedia
- Guest posts on dev.to / Hashnode / Medium using `/methodology` and
  `/rejected` as the unique-angle hook
- Quarterly "State of developer complaints" PDF + landing page, once enough
  signal history exists to make the data genuinely interesting (needs a few
  months of poller-expansion volume to be worth publishing — not a Part 1
  priority, revisit once signal count is meaningfully larger)
- 2-3 podcast pitches (Indie Hackers, Software Social, MegaMaker)

## Files to create

- `app/category/page.tsx` (index of all categories)
- `app/category/[category]/page.tsx`
- `app/platform/[platform]/page.tsx`
- `app/stack/[technology]/page.tsx`
- `app/api/[matched-api]/page.tsx` (naming note: check this doesn't collide
  with an existing `app/api/` route used for actual API endpoints — Next.js
  app router treats `app/api/` specially for route handlers; may need a
  different path like `app/tools/[matched-api]/page.tsx` to avoid
  collision — confirm before implementing)
- `app/signals/page.tsx` (paginated)
- `app/sitemap.ts`
- Shared query helpers for "briefs by category," "briefs by platform,"
  "briefs by stack," "briefs by API" if they don't already exist as
  reusable functions

## Files to modify

- Brief page template — add interlinking sections (Part 3) and HowTo schema
  (Part 4.2)
- `/methodology`, `/pricing` — add FAQ schema if content supports it
- Root layout or shared component — add BreadcrumbList schema

## Acceptance criteria

- [ ] Category, platform, stack, and API pages generate only for values with ≥1 published brief (no empty/doorway pages)
- [ ] Each generated page has unique title, meta description, canonical URL
- [ ] `/signals` page live, paginated, listing raw ingested signals with source links
- [ ] Brief pages now link out to their category page, platform page(s), and 2-3 related briefs
- [ ] `sitemap.xml` generated dynamically and includes all page types listed in 4.1
- [ ] FAQ schema present on `/methodology` and/or `/pricing` (wherever FAQ content genuinely exists)
- [ ] HowTo schema present on brief pages (if draft data supports structured steps)
- [ ] BreadcrumbList schema present site-wide
- [ ] `tsc --noEmit` clean
- [ ] Manually spot-check 3-5 generated pages in Google's Rich Results Test tool to confirm schema is read correctly, not just present in markup

## Rollback plan

All additive — new routes and template additions, no changes to existing
data or existing page behavior. Any generated page type can be removed by
deleting its route file without touching anything else.

## Notes for the implementer

- Confirm Next.js router convention (app vs pages) from the existing
  codebase before starting — don't assume app router just because it's
  more common in new projects.
- The `app/api/[matched-api]/page.tsx` naming collision risk (noted above)
  is a real gotcha specific to Next.js app router — resolve the path name
  before writing code, not after hitting a build error.
- For ISR revalidation, confirm the hosting setup (Vercel per earlier specs)
  supports the revalidate approach chosen — Vercel's ISR works out of the
  box with `export const revalidate = 86400` in a page file, no extra
  config needed on their platform.
- Category/platform/stack/API values should be URL-slugified consistently
  (lowercase, hyphens, no special characters) — check if a slugify utility
  already exists in the codebase before adding a new dependency for this.
- `/signals` pagination: avoid indexing infinite deep pages. A reasonable
  approach is `rel=next`/`rel=prev` link tags (though deprecated by Google
  for ranking purposes, still useful for crawler navigation) and keeping
  the sitemap limited to the first 5-10 pages, letting deeper pages be
  crawlable-but-not-sitemap-submitted.
