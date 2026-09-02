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

## Ingest pipeline (local/free by default)
The signal-ingest pipeline (`npm run ingest:dry-run` / Vercel cron) classifies
scraped complaints and drafts idea cards from them. As of
`omniroute-drafts-and-ollama-lockin-spec.md`, both stages default to local,
free services and treat OpenRouter as an optional fallback:

- **Classification** — Ollama (`lib/llm/classifier.ts`), model set by
  `OLLAMA_CLASSIFIER_MODEL`.
- **Draft generation** — OmniRoute (`lib/llm/draft-generator.ts`), a
  self-hosted AI gateway, model set by `OMNIROUTE_DRAFT_MODEL`.

Running the pipeline from falcon (or any machine on the same LAN with
`OLLAMA_URL` and `OMNIROUTE_URL` set — see `.env.example`) requires: Ollama
running, OmniRoute running, and Supabase credentials. It does **not** require
an OpenRouter credit balance.

`OPENROUTER_API_KEY` is still needed as a configured fallback — the code path
exists and is exercised automatically if either local service is
unreachable — but the account can sit at $0 balance indefinitely under
normal (falcon-available) operation.

If the pipeline ever runs from anywhere other than falcon (e.g. a future
Vercel cron job), OpenRouter becomes load-bearing again, since neither Ollama
nor OmniRoute are reachable off the local network — a funded OpenRouter
balance is required for that case.
