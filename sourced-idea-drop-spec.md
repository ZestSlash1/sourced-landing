# Sourced — Idea Drop Implementation Spec

Hand this file to Claude Code as-is (paste into a fresh conversation, or drop it
in the repo as `SPEC.md` and reference it in your prompt). It's self-contained.

## Context

Sourced is a Next.js (App Router) subscription product. Each week it publishes
"idea drops" — validated micro-SaaS ideas sourced from real complaints — to
subscribers. Pricing tiers: `free`, `builder` (₹399/mo), `studio` (₹999/mo).
Payments via Razorpay. This spec covers one vertical slice: the idea drop data
model, tier-gated API delivery, and evidence validation at publish time.

## Task 1 — Types

Create `types/idea-drop.ts` with the interfaces below. Do not add fields beyond
what's specified — this is the full v1 contract.

```typescript
export interface IdeaDrop {
  id: string;                    // "sourced-2026-08-29-001"
  slug: string;                  // url-safe, derived from title
  title: string;
  category: string;
  demandScore: number;           // 0-100, computed at ingest (see Task 3)
  tags: string[];
  publishedAt: string;           // ISO date
  tier: "free" | "builder" | "studio";  // minimum tier required to view full drop

  problem: {
    summary: string;             // 1-2 sentences
    whoFeelsIt: string;          // target user description
  };

  evidence: Evidence[];          // min 3, validated at ingest — see Task 3

  whyNow: string;                // 1-2 sentences

  buildBrief: {
    coreLoop: string[];          // ordered steps, 3-5 items
    mvpScope: string[];          // what's IN
    explicitlyCut: string[];     // what's OUT
    dataModel: DataEntity[];
  };

  matchedApis: MatchedApi[];

  launchStack: StackItem[];

  agentPrompts: {
    claudeCode: string;
    cursorWindsurf: string;
    v0Bolt: string;
  };

  difficulty: {
    soloWeekendProject: boolean;
    estimatedHours: number;
    skillFloor: "beginner" | "intermediate" | "advanced";
  };

  status: "draft" | "needs_evidence" | "published";  // see Task 3
  validationErrors?: string[];   // populated when status = "needs_evidence"
}

export interface Evidence {
  platform: "reddit" | "g2" | "upwork" | "twitter" | "hackernews" | "other";
  subforum?: string;             // e.g. "r/SaaS", or product name for G2
  quote: string;                 // paraphrased or short direct quote
  url: string;
  date: string;                  // ISO date
  engagementMetric?: {
    type: "upvotes" | "budget_usd" | "review_rating" | "replies";
    value: number;
  };
}

export interface DataEntity {
  name: string;                  // e.g. "User", "Listing"
  fields: string;                // freeform, e.g. "id, email, plan_tier, created_at"
}

export interface MatchedApi {
  name: string;
  purpose: string;               // what it does for THIS idea specifically
  freeTierLimit: string;         // e.g. "100 req/day"
  sourceUrl: string;             // public-apis link
}

export interface StackItem {
  layer: "hosting" | "auth" | "database" | "payments" | "storage" | "email" | "other";
  tool: string;
  freeTierNote: string;
  sourceUrl?: string;            // free-for-dev link
}

// The shape sent to under-tier users — see Task 2
export type IdeaDropTeaser = Pick<
  IdeaDrop,
  "id" | "slug" | "title" | "category" | "demandScore" | "tags" |
  "publishedAt" | "tier" | "problem" | "status"
> & {
  evidence: Evidence[];   // truncated to exactly 1 item
  locked: true;
};
```

## Task 2 — Server-side tier gating

Create `lib/idea-drops/scope-to-tier.ts`:

```typescript
import type { IdeaDrop, IdeaDropTeaser } from "@/types/idea-drop";

const TIER_RANK = { free: 0, builder: 1, studio: 2 } as const;

export function scopeToTier(
  idea: IdeaDrop,
  userTier: keyof typeof TIER_RANK
): IdeaDrop | IdeaDropTeaser {
  const canViewFull = TIER_RANK[userTier] >= TIER_RANK[idea.tier];
  if (canViewFull) return idea;

  return {
    id: idea.id,
    slug: idea.slug,
    title: idea.title,
    category: idea.category,
    demandScore: idea.demandScore,
    tags: idea.tags,
    publishedAt: idea.publishedAt,
    tier: idea.tier,
    problem: idea.problem,
    status: idea.status,
    evidence: idea.evidence.slice(0, 1),
    locked: true,
  };
}
```

**Requirements — do not deviate:**
- This function must run in the API route handler (`app/api/ideas/`), never in
  a client component. The full `IdeaDrop` object must never be serialized into
  a response sent to an under-tier user, even inside `<script>` hydration data
  or a Next.js RSC payload.
- Gated fields (`evidence` beyond index 0, `buildBrief`, `matchedApis`,
  `launchStack`, `agentPrompts`, `difficulty`) must be **absent from the
  object**, not `null`, not empty string, not empty array. Absence is what
  keeps someone reading the network tab from inferring the shape of paid
  content.
- If a user requests a single idea directly by ID/slug
  (`GET /api/ideas/[id]`) and is under-tier, return the teaser shape with a
  `200`, not a `403` — the teaser is meant to be visible (it's the upsell). A
  `403` is only appropriate if the idea's `status` is not `"published"`
  (drafts/needs_evidence should 404 for everyone except an admin role, if one
  exists — flag this to the user if no admin auth exists yet rather than
  inventing one).

## Task 3 — Evidence validation (hard gate at publish)

Create `lib/idea-drops/validate-evidence.ts`:

```typescript
import type { Evidence } from "@/types/idea-drop";

export interface EvidenceValidationResult {
  valid: boolean;
  errors: string[];
}

export function validateEvidence(evidence: Evidence[]): EvidenceValidationResult {
  const errors: string[] = [];
  const ninetyDaysAgo = new Date();
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

  if (evidence.length < 3) {
    errors.push(`Only ${evidence.length} evidence item(s) — minimum 3 required`);
  }

  const platforms = new Set(evidence.map((e) => e.platform));
  if (platforms.size < 2) {
    errors.push(`Evidence spans only ${platforms.size} platform(s) — minimum 2 required`);
  }

  const hasRecent = evidence.some((e) => new Date(e.date) >= ninetyDaysAgo);
  if (!hasRecent) {
    errors.push("No evidence dated within the last 90 days");
  }

  return { valid: errors.length === 0, errors };
}
```

**Ingest pipeline wiring (wherever ideas are created/updated — e.g. a CMS
webhook, an admin form submit, or a script):**

1. On create or update, run `validateEvidence(idea.evidence)`.
2. If `valid: false` — set `status: "needs_evidence"`, store the `errors`
   array on `idea.validationErrors`, and **do not** allow `status` to be set
   to `"published"` regardless of what the caller requested. This must be
   enforced server-side (e.g. in the DB write path or API route), not just in
   a form's client-side validation, so a direct API call can't bypass it.
3. If `valid: true` — clear `validationErrors`, allow `status` to proceed to
   whatever the caller requested (`draft` or `published`).
4. `needs_evidence` ideas should be visible in an internal/admin view (however
   ideas get authored — ask the user if unclear) with the specific error
   list shown inline, so whoever is sourcing ideas can fix and resubmit.
5. `needs_evidence` and `draft` ideas must never be returned by the public
   `/api/ideas` list or detail routes, for any tier.

## Task 4 — Wire into existing masonry card UI

The idea card component (already built) should accept `IdeaDrop | IdeaDropTeaser`
as its prop type and branch on `"locked" in idea`:
- Locked (teaser): render the card with a lock icon/overlay, show
  `problem.summary` and the single evidence item, CTA to upgrade tier.
- Full: render as currently implemented.

Do not fetch the full idea and hide fields client-side to achieve this — the
API response itself must already be scoped per Task 2.

## Acceptance checks before calling this done

- [ ] Under-tier `GET` request to a single idea returns a payload with the
      gated keys genuinely absent (verify via `Object.keys()` in a test, not
      just visual inspection).
- [ ] An idea with 2 evidence items cannot reach `status: "published"` via any
      code path, including a direct API call with `status: "published"` in
      the body.
- [ ] An idea with 3 evidence items all from Reddit cannot be published
      (platform-diversity check).
- [ ] An idea with 3 evidence items from 2+ platforms but all >90 days old
      cannot be published.
- [ ] `needs_evidence` ideas do not appear in `/api/ideas` (list) for any
      tier.
