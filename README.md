# Sourced — landing page (Next.js)

## Run locally
```
npm install
npm run dev
```
Open http://localhost:3000

## Deploy (fastest path)
1. Push this folder to a GitHub repo
2. Go to vercel.com → New Project → import the repo → Deploy (zero config, standard Next.js App Router project)
3. In Vercel: Settings → Domains → add your purchased domain and follow the DNS steps

## Where to edit
- All copy, the sample idea cards, and layout: `app/page.tsx` (the `ideaCards` array at the top feeds the masonry grid — add/edit entries there)
- Design tokens (colors, fonts, spacing): `app/globals.css` — CSS variables at the top (`--violet`, `--coral`, `--lime`, `--sky`, `--sun`) control the whole palette and the card cover gradients
- Page title / meta description: `app/layout.tsx`

## Wiring up real signups (next step, not included yet)
- Free tier button → email-capture form (Supabase table + a tiny API route, or a Beehiiv/ConvertKit embed)
- Paid tier buttons → Stripe or Razorpay Payment Links — fastest way to get paid without building custom checkout

## Idea drop pipeline (Phase 2)

Copy `.env.example` to `.env.local` and fill in the values you have before running any of this locally.

- **Types & tier gating** — `types/idea-drop.ts`, `lib/idea-drops/scope-to-tier.ts`, `lib/idea-drops/validate-evidence.ts`. Public reads go through `GET /api/ideas` and `GET /api/ideas/[id]`, which always scope the response server-side by the requester's tier (`?email=`, since there's no auth/session system yet).
- **Authoring** — `GET/POST /api/admin/ideas` and `GET/PATCH /api/admin/ideas/[id]`, gated by an `ADMIN_API_TOKEN` bearer token (a stopgap — there's no real admin role system yet). Every create/update runs the evidence-validation gate server-side; an idea can never reach `status: "published"` with under-evidenced or evidence, regardless of what the caller requests.
- **Storage** — `data/idea-drops.json` and `data/subscribers.json` are JSON-file stores (same pattern as `data/public-apis.json`), standing in for a real DB. They work for local dev; on Vercel's read-only filesystem writes won't persist — swap `lib/idea-drops/store.ts` / `lib/subscriptions/store.ts` for a real DB client (e.g. ticket-01's Supabase `subscribers` table) once one exists.
- **Ingest (Phase 1)** — `npm run ingest -- <subreddit> [<subreddit> ...]` pulls Reddit threads, screens/paraphrases them into `Evidence` via an LLM call, clusters related evidence into draft `IdeaDrop`s, and writes them to the store as `status: "draft"`. G2 (`lib/ingest/sources/g2.ts`) and Upwork (`lib/ingest/sources/upwork.ts`) are manual-paste fallbacks — G2 has no public API and scraping it risks their ToS, and Upwork's API needs credentials that aren't configured.
- **Agent prompt generation (Phase 2)** — `lib/prompts/generate-agent-prompts.ts` produces the `claudeCode` / `cursorWindsurf` / `v0Bolt` prompt variants in one structured-JSON LLM call. It re-runs automatically on `PATCH /api/admin/ideas/[id]` whenever `buildBrief` actually changed.
- **Razorpay tier wiring (Phase 3)** — `POST /api/webhooks/razorpay` verifies the signature and updates subscriber tier/status from `subscription.activated|charged|halted|cancelled` events; `past_due` keeps paid-tier access for `SUBSCRIPTION_GRACE_DAYS` (default 3) before falling back to free. `GET /api/checkout/[plan]` redirects to the Payment Link env vars from ticket-01.
