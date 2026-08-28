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
