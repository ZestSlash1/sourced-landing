# Idea: Review Sentinel for Etsy

## One-liner
A tool that watches your Etsy shop's reviews and warns you the moment a low-star review is about to become the first thing buyers see — before it costs you sales.

## The problem
Etsy's default "Suggested" review sort doesn't necessarily favor recent or representative reviews. It can push a single old 1- or 2-star review above hundreds of 5-star ones, and sellers have no visibility into this happening — or any first-party way to fix it.

## Proof of demand (real complaints, not guesses)
- **"Suggested Reviews Ruining My Shop"** — Etsy Community Forums, Dec 2024. A seller restarting their shop after a hiatus found the app's default "Suggested" view surfaced their bad reviews first, despite a 4.9 overall rating and 1,000+ sales. Etsy support confirmed the behavior and said nothing could be done on their end.
  https://community.etsy.com/t5/Technical-Issues/Suggested-Reviews-Ruining-My-Shop/m-p/147330519
- **"Can't reply to negative feedback... showing as Suggested at the top"** — separate seller, same pattern: a single 1-star review out of ~600 five-stars became the top "suggested" review on a listing, confirmed reproducible even in incognito.
  https://community.etsy.com/t5/Technical-Issues/Can-t-reply-to-negative-feedback-Etsy-is-now-showing-as/td-p/143762883
- **"Etsy's tracking tool reports incorrect data, customers ask for refunds"** — a separate but related trust-in-reviews thread that accumulated dozens of replies/likes across Sept 2022–2023, showing this isn't a one-off gripe.
- Etsy's own Star Seller / Order Defect Rate policy can suspend a shop once 1%+ of reviews are 1–2 stars — a misplaced bad review risks the account, not just a sale.
- **Why this matters for Sourced:** the same complaint resurfaces independently in 2022, 2024, and 2025 threads — a durable, recurring pain point, not a single vent — and Etsy support has confirmed on record that there's no fix coming from their side. That's the gap.

## Target user
Solo and small Etsy sellers — the exact demographic in the threads above — who check their shop's rating manually (if at all) and have no early warning system.

## The build (v1 scope, weekend-buildable)
1. **Auth:** Etsy OAuth 2.0 (Authorization Code + PKCE) via an Etsy "Seller App" registration. Etsy's own docs state Seller App access is approved within minutes, no manual review queue — so seller onboarding isn't gated on a slow approval.
2. **Poll:** `GET /v3/application/shops/{shop_id}/reviews` (Etsy Open API v3, `getReviewsByShop`) on a schedule — every 6–12h is plenty for v1.
3. **Heuristic (v1, no algorithm reverse-engineering needed):** flag any incoming review ≤2 stars on a shop whose rolling aggregate rating is ≥4.5. That's the exact "surprising outlier that will stick out" scenario sellers described losing sales over. Refine later if you want to approximate actual suggested-sort position.
4. **Alert:** email the seller immediately when a review is flagged, with a direct link to respond (note: Etsy allows one seller reply per review, and it's permanent once posted — worth surfacing that constraint in the UI).
5. **Dashboard:** shop rating trend over time, list of flagged reviews, flag status (responded / not).
6. **Be honest in the product copy:** this is a proxy signal (rating-outlier detection), not a live scrape of Etsy's actual "Suggested" ranking — don't overclaim precision.

## Matched free APIs
- **Etsy Open API v3** — free with a registered app; `getReviewsByShop` / `getReviewsByListing` cover exactly what's needed.
- **Resend** (or similar) — free tier for email alerts (100/day is enough for an MVP's early users).

## $0 launch stack
- **Vercel** (Hobby plan) — hosting + Cron Jobs for the polling schedule
- **Supabase** (free tier) — Postgres for shop tokens/review snapshots + auth
- **Etsy Open API v3** — free
- **Resend** free tier — email alerts

No infra spend to get to a working MVP.

## Suggested pricing (fits Sourced's existing tiers)
- **Free:** 1 shop, daily check
- **Builder (₹399/mo):** up to 3 shops, 6-hourly check, AI-drafted reply suggestions
- **Studio (₹999/mo):** unlimited shops, hourly check, priority alert channel (SMS/WhatsApp)

## Why this is a good weekend build
The technical surface is small — one polling job, one heuristic, one notification channel — and it uses Etsy's *official* reviews API, so there's no fragile HTML scraping to maintain. The demand signal is unusually solid for a micro-SaaS idea: the same pain shows up in independent threads three years apart, with Etsy support on record saying they won't fix it.
