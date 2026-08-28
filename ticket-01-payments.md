# Ticket 01 — Payments (Razorpay Payment Links + webhook)

## Goal
A visitor can go from the pricing section to a paid subscription (Builder or Studio) without a custom checkout build, and the app knows they're paid afterward.

## Why Razorpay, not Stripe
India-based business, INR pricing — Razorpay's card fees are meaningfully lower than Stripe's for domestic cards, and payouts settle in INR with no conversion step. Use Stripe only if a meaningful share of subscribers turn out to be paying in USD later.

## Scope

### 1. Razorpay setup (manual, not code — do this first)
- Razorpay account, business KYC completed
- Two Payment Links created in the Razorpay dashboard (or two Plans + Subscriptions if recurring billing is wanted from day one — see "Recurring vs. one-off" below):
  - Builder — ₹399/mo
  - Studio — ₹999/mo
- Note the Payment Link URLs (or Plan IDs) and the webhook signing secret — these become env vars

### Recurring vs. one-off — decide before building
Two honest options:
- **Simple (recommended for launch):** Razorpay **Payment Links**, one-time charge, manually renewed. Ship this first — it's a URL, zero integration code beyond the webhook. Downside: no auto-renewal, you re-invoice manually or ask the customer to re-pay monthly. Fine for the first ~100 founding subscribers.
- **Proper (do this once volume justifies it):** Razorpay **Subscriptions API** with recurring mandates. More integration work (customer + subscription objects, not just a link). Don't build this for launch — the manual version is enough to prove the funnel.

This ticket specs the **simple** version.

### 2. Environment variables
```
RAZORPAY_KEY_ID=
RAZORPAY_KEY_SECRET=
RAZORPAY_WEBHOOK_SECRET=
BUILDER_PAYMENT_LINK=https://rzp.io/l/xxxxxxx
STUDIO_PAYMENT_LINK=https://rzp.io/l/xxxxxxx
DATABASE_URL=            # Supabase connection string, from ticket 03
```

### 3. Frontend change
In `app/page.tsx`, the `.plan-btn` links for Builder and Studio currently point to `#`. Point them to the two Payment Link URLs (from env vars, passed via `next.config.mjs` `env` or a server-side redirect route — do not hardcode the raw URLs in the client bundle if you want to be able to rotate them without a redeploy; a thin `/api/checkout/[plan]` redirect route is the cleaner pattern).

- `app/api/checkout/[plan]/route.ts` — reads `plan` param (`builder` | `studio`), 302-redirects to the matching env-var Payment Link. Returns 400 for any other value.
- Update the two `.plan-btn` hrefs to `/api/checkout/builder` and `/api/checkout/studio`.

### 4. Webhook endpoint
- `app/api/webhooks/razorpay/route.ts` — POST handler
- Verify the `X-Razorpay-Signature` header against `RAZORPAY_WEBHOOK_SECRET` (HMAC SHA256 over the raw request body — must read the raw body before any JSON parsing, Next.js route handlers need `req.text()` first for this to work)
- Reject with 400 if signature doesn't match — do not process unverified payloads
- On a verified `payment_link.paid` event: extract the customer email and the plan (from the Payment Link's `reference_id` or `notes` field — set this when creating the Payment Link in the dashboard so the webhook can tell Builder from Studio)
- Upsert a row in a `subscribers` table: `email`, `plan`, `status='active'`, `paid_at`
- Return 200 quickly (Razorpay retries on non-2xx — don't do slow work in the handler; queue anything heavy)

### 5. Minimal data model (Supabase, or wherever ticket 03's DB lives)
```sql
create table subscribers (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  plan text not null check (plan in ('builder', 'studio')),
  status text not null default 'active',
  paid_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);
```

### 6. What "the app knows they're paid" means for this ticket
Out of scope: a login system. In scope: the `subscribers` table exists and is correctly populated by the webhook. Gating actual content on `subscribers.status = 'active'` is ticket 03 (content gating) — don't build auth here, just get the webhook writing correct rows.

## Out of scope for this ticket
- Auto-renewal / recurring subscriptions (see note above)
- Failed payment retry / dunning emails
- A customer-facing billing portal (cancel, update card) — Razorpay's own portal covers this for now
- Refund handling — do this manually via the Razorpay dashboard for the 7-day guarantee until volume justifies automating it

## Acceptance criteria
- [ ] Clicking "Get Builder" or "Get Studio" redirects to the correct Razorpay Payment Link
- [ ] Completing a test payment (Razorpay test mode) fires the webhook
- [ ] The webhook handler verifies the signature and rejects tampered/unsigned requests with 400
- [ ] A successful payment creates or updates the correct row in `subscribers`
- [ ] The webhook responds within a few seconds and returns 200 on success
- [ ] Env vars are read from `process.env`, never hardcoded

## Test notes
Razorpay provides test mode with test card numbers — use this for the full flow before going live. Test the webhook signature check specifically with a deliberately wrong secret to confirm it actually rejects.
