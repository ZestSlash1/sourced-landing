# Task: swap hero background + pricing section visuals only

Reference implementation attached: `sourced-pipeline-hero.html` (open it directly
in a browser first — it's a self-contained working preview of exactly what to build).

## Hard constraints — read before touching anything

- **Do not refactor, rename, reorganize, or "clean up" anything you weren't
  explicitly asked to change.** If a file needs one new import and one JSX block
  swapped, that's the only diff it should have.
- **Do not touch:** routing, data fetching, Supabase queries, the
  `idea_drops` / pipeline logic, auth, the feed/methodology/rejected pages,
  or any copy/content outside the two sections named below.
- **Do not change the existing terminal (`$ claude code brief.md`) or agent
  tabs (Claude Code/Cursor/Windsurf/v0/Bolt) components** — keep them exactly
  as they are today, just sitting in front of the new background instead of
  the globe.
- If the current hero component mixes the globe rendering logic with other
  unrelated logic in one file, **extract only the globe part** into its own
  component before removing it — don't drag unrelated code along in the diff.
- Before starting, run the existing build/lint/typecheck and confirm it's
  green. Re-run after your changes and confirm the diff is still green and
  that the *only* files changed are the ones listed below.
- Work on a branch (e.g. `hero-pipeline-visual`) and open it as a Vercel
  preview deployment. **Do not merge to `main` / push to production until
  the preview has been reviewed** — this touches the homepage.

## What to change

### 1. Hero background: globe → pipeline particle field

- Find the current globe component (search for "SYS.RADAR", "POINTER
  PARALLAX", or the wireframe sphere / Three.js globe setup — likely
  something like `components/hero/Globe.tsx` or similar).
- Port the `PipelineField` class from `sourced-pipeline-hero.html` into a new
  client component, e.g. `components/hero/PipelineField.tsx`:
  - Add `"use client"` at the top.
  - Mount it on a `<canvas>` ref inside `useEffect`, teardown
    (`cancelAnimationFrame`, remove listeners, `renderer.dispose()`) in the
    effect's cleanup function — the reference file doesn't need this since
    it never unmounts, but a Next.js component does.
  - Replace `import * as THREE from 'https://unpkg.com/...'` with a real
    dependency: `npm i three` (and `npm i -D @types/three` if the repo is
    TypeScript), then `import * as THREE from 'three'`.
  - Keep the `prefers-reduced-motion` fallback branch — don't drop it.
- Swap the globe component out for `<PipelineField />` in the hero section.
  Leave every sibling element (headline, subhead, CTAs, terminal, agent
  tabs) exactly where they are — only the background layer changes.
- The five source counts (HN 126 / GH 77 / SE 117 / DEV 35 / LOB 15) are
  hardcoded in the reference file. Wire them to the same real counts already
  used on `/methodology` (pull from wherever that page gets its numbers —
  `pipeline_runs` / `raw_signals`) so the hero and methodology page can't
  drift out of sync. If that data isn't easily available client-side, it's
  fine to pass it in as a prop from a server component / server-fetched
  value rather than hardcoding.
- Reuse existing copy if the hero headline/subhead/CTA text already differs
  from the reference file — the reference copy ("The internet's already
  telling you what to build" etc.) was written for this handoff and is a
  suggestion, not a requirement to overwrite existing approved copy. If the
  current hero copy is already final, keep it and just swap the background.

### 2. Pricing section restyle

- Find the current pricing section/component.
- Restyle to match the reference file's card treatment: dark glass cards,
  cursor-tracked radial glow per card (plain CSS custom properties + a
  `pointermove` handler, ~15 lines, see `trackGlow`-equivalent block near
  the bottom of the reference file), "most used" badge on the Builder tier.
- **Do not change the actual plan data** (₹0 / ₹399 / ₹999, unlock counts,
  feature lists) unless it's already wrong — pull real values from wherever
  pricing is currently sourced in the codebase rather than copying the
  numbers out of the reference file, in case they've changed since this was
  written.
- If pricing already has its own component file, restyle in place — don't
  create a parallel/duplicate pricing component.

## Verification checklist before opening the PR

- [ ] `git diff --stat` shows only the expected files touched
- [ ] Build, lint, typecheck all pass
- [ ] Hero renders correctly with JS disabled / reduced-motion (should show
      the static fallback, not a broken canvas)
- [ ] Mobile viewport (375–414px) checked — nav, CTAs, agent tabs, and
      pricing cards all need to still work at that width (this was a real
      bug in the first pass of the reference file, since fixed there, but
      re-verify once it's in your actual layout/breakpoints, which may
      differ from the standalone reference)
- [ ] No console errors, no failed network requests for the `three` import
- [ ] Lighthouse / perf sanity check — the particle canvas is running a
      per-frame JS loop; confirm it's not tanking the homepage's score
- [ ] Feed, methodology, rejected, and any other existing pages load
      unaffected

## Deploy

Open as a PR against `main` with a Vercel preview link. Don't auto-merge —
flag it back for a manual look at the preview before it goes live.
