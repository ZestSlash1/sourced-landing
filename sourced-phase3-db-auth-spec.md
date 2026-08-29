# Sourced — Phase 3 Build Spec: Real DB + Real Admin Auth

Hand this to Claude Code as-is. Replaces the two flagged stopgaps from
Phase 2 (`data/idea-drops.json` / `data/subscribers.json` JSON stores, and
the single `ADMIN_API_TOKEN` bearer token) with Supabase-backed persistence
and real auth — matching the stack already in use on Kraft's ops portal
(portal.shafrina.com) and Mettel (mettel.in): Supabase + Vercel, Razorpay
already wired in Phase 3 of the previous spec.

Do these two tracks in either order — they don't depend on each other.
Both must land before Phase 4 (first real drop) is re-run as a final check.

---

## Track A — Supabase as the real DB

### Task A.1 — Schema

Create a migration (`supabase/migrations/xxxx_idea_drops_and_subscribers.sql`)
with tables mirroring the existing TypeScript types exactly — don't
redesign the shape, just give it a real home:

```sql
create table idea_drops (
  id text primary key,
  slug text unique not null,
  title text not null,
  category text not null,
  demand_score int not null check (demand_score between 0 and 100),
  tags text[] not null default '{}',
  published_at date,
  tier text not null check (tier in ('free', 'builder', 'studio')),
  problem jsonb not null,        -- { summary, whoFeelsIt }
  evidence jsonb not null default '[]',
  why_now text,
  build_brief jsonb,             -- { coreLoop, mvpScope, explicitlyCut, dataModel }
  matched_apis jsonb default '[]',
  launch_stack jsonb default '[]',
  agent_prompts jsonb,           -- { claudeCode, cursorWindsurf, v0Bolt }
  difficulty jsonb,
  status text not null default 'draft' check (status in ('draft', 'needs_evidence', 'published')),
  validation_errors text[],
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table subscribers (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  razorpay_subscription_id text,
  tier text not null default 'free' check (tier in ('free', 'builder', 'studio')),
  status text not null default 'active' check (status in ('active', 'past_due', 'cancelled')),
  tier_renews_at timestamptz,
  grace_period_ends_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- RLS: match the "RLS on all tables" invariant already established on
-- kraft-portal. Public/anon reads only through the API route's service-role
-- client (Task A.3), never direct client-side Supabase calls to these
-- tables — so RLS should default-deny and the service role bypasses it.
alter table idea_drops enable row level security;
alter table subscribers enable row level security;
-- No public policies added — access goes through server-side routes only.
```

Keep `jsonb` for the nested structured fields (`problem`, `evidence`,
`buildBrief`, etc.) rather than normalizing into further tables — the shapes
are stable, already typed in TypeScript, and normalizing them buys nothing
at this scale while adding join complexity to every read path.

### Task A.2 — One-time migration script

Create `scripts/migrate-json-to-supabase.ts`: read the existing
`data/idea-drops.json` and `data/subscribers.json`, insert each record into
the new tables via the service-role client, log a count of rows migrated,
and **do not delete the JSON files** — keep them as a rollback reference
until the new store has been verified in production for a few days.

### Task A.3 — Replace the store layer

Rewrite `lib/idea-drops/store.ts` and `lib/subscriptions/store.ts` so their
exported function signatures stay identical (every call site elsewhere in
the app — `scopeToTier`, the ingest pipeline, the admin views — should need
zero changes). Internally, swap the JSON read/write for a Supabase
service-role client:

```typescript
// lib/supabase/service-client.ts
import { createClient } from "@supabase/supabase-js";

// Service role key — server-only, never exposed to the client bundle.
// Follow the same convention already established on Mettel: this key must
// never appear in a NEXT_PUBLIC_-prefixed env var.
export const supabaseService = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);
```

```typescript
// lib/idea-drops/store.ts — same exported shape as before, new internals
export async function getIdea(id: string): Promise<IdeaDrop | null> { /* ... */ }
export async function listPublished(): Promise<IdeaDrop[]> { /* ... */ }
export async function saveIdea(idea: IdeaDrop): Promise<void> { /* ... */ }
// etc — mirror whatever functions the JSON-backed version already exported
```

**Acceptance check:** every existing call site (`scopeToTier`, ingest
pipeline, admin routes, validation gate) works unchanged after this swap —
if any call site needed editing beyond an import path, the store's public
interface wasn't preserved correctly and that's a bug to fix, not a
call-site update to make.

### Task A.4 — Env vars

Add `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` to Vercel env config
(production + preview). Confirm they're **not** prefixed `NEXT_PUBLIC_` —
this table holds unpublished draft ideas and subscriber emails, neither of
which should ever be fetchable from a client-side Supabase call.

---

## Track B — Real admin auth

Given Sourced is a solo-operator product (no team members needing separate
admin accounts, per the existing setup), the right-sized solution is
Supabase Auth with a single admin user — not a full multi-role permission
system. This replaces the bearer-token stopgap with a real login, not with
more infrastructure than the product needs.

### Task B.1 — Admin user

Create one Supabase Auth user for the admin (email/password or magic link —
ask the user which they prefer). Add an `is_admin` claim or a simple
`admins` table keyed by user ID:

```sql
create table admins (
  user_id uuid primary key references auth.users(id)
);
```

### Task B.2 — Admin route protection

Replace every place currently checking `Authorization: Bearer ${ADMIN_API_TOKEN}`
with a Supabase session check:

```typescript
// lib/auth/require-admin.ts
import { createServerClient } from "@supabase/ssr";

export async function requireAdmin(req: Request): Promise<{ ok: true } | { ok: false; status: number }> {
  const supabase = createServerClient(/* cookies from req, per @supabase/ssr docs */);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, status: 401 };

  const { data: admin } = await supabase
    .from("admins")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!admin) return { ok: false, status: 403 };
  return { ok: true };
}
```

Use this in every admin API route (idea authoring, ingest trigger, evidence
review) the same way the token check was used before — same call sites,
different check.

### Task B.3 — Admin login page

Build a minimal `/admin/login` page — email/password or magic-link form,
whichever was chosen in B.1. No need for a polished design; this is a
single-user internal tool. Match the existing site's basic styling
conventions rather than building new ones for a page only Zebi will see.

### Task B.4 — Remove the stopgap

Delete `ADMIN_API_TOKEN` from env vars once B.1–B.3 are confirmed working,
and remove the bearer-token check code entirely rather than leaving it as
dead/fallback logic.

**Acceptance check:** an admin route rejects an unauthenticated request with
`401`, rejects an authenticated-but-non-admin request with `403` (test this
by creating a throwaway non-admin Supabase user), and succeeds for the real
admin session. The old bearer token, if reused, no longer grants access.

---

## Final step — re-run Phase 4

Once both tracks land, re-run the Phase 4 end-to-end check from the previous
spec (ingest → draft → fill → validate → publish → tier-gated fetch → UI
render) against the new Supabase-backed store and real admin auth, not the
JSON/token stopgaps. This confirms the swap didn't silently break anything
the JSON version was quietly getting right by accident.
