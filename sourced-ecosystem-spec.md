# Ecosystem Cross-Promotion Spec — Sourced × Slatebase × Brink

**For:** Claude Code, working in the `sourced-landing` repo (Next.js App Router + Supabase)
**Repo:** ZestSlash1/sourced-landing, local copy `C:\Users\falcon\Downloads\sourced-nextjs`, active branch `main`

Read `/areas/sourced.md`-equivalent context (design system, schema) and the actual
`IdeaDropCard`, `Footer`, and `/feed` components in this repo before writing any
code — this spec describes shape and intent, not literal prop names, since I
haven't seen the current component source.

## 1. Context & rationale

Three products, one builder, adjacent categories in the "build → host → run AI
stuff" stack:

- **Sourced** — gives direction (validated build briefs for AI/dev tools)
- **Slatebase** — hosts the AI service *(assumed: managed inference/hosting)*
- **Brink** — monitors usage *(assumed: API cost / rate-limit tracking)*

Sourced already pulls in vibe-coder traffic actively looking for AI tooling.
Cross-promoting the other two here is high-relevance, zero-cost distribution —
if it's done as genuine recommendation, not a display ad bolted onto the site.

## 2. Design principles

1. **Contextual over generic.** Surface Brink next to drops tagged around
   API cost / rate limits / usage tracking. Surface Slatebase next to drops
   tagged around hosting / deployment / inference. Generic rotation only where
   no tag matches (footer, `/ecosystem` page).
2. **Native visual language.** Reuse Sourced's existing card/chip system
   (Space Grotesk / JetBrains Mono, violet #7C3AED accent) as the container
   chrome. Let each partner's own accent color show through only in a small
   icon mark — never a repainted-violet Sourced card, never a foreign banner ad.
3. **Always labeled.** Every placement carries a small "From the ecosystem" or
   "Built by the same team" eyebrow chip. It's not a paid ad right now, so it
   shouldn't visually pretend to be one.
4. **No modals or popups.** Sourced's own signup/unlock funnel takes priority
   over cross-promotion; ecosystem placements are inline only.

## 3. Placements, in build priority

1. **Footer ecosystem strip** (site-wide) — three small chips: Sourced
   (current, dimmed), Slatebase, Brink. Cheapest to build, guaranteed
   impressions on every page.
2. **`/ecosystem` page** — dedicated route, fuller pitch per product (one-liner,
   2–3 feature bullets, CTA). Linked from footer + nav.
3. **Contextual card in `/feed`** — every 6th feed item replaced by an
   ecosystem card in the same visual shape as `IdeaDropCard`, tag-matched,
   alternating partners, never twice in a row.
4. **Contextual banner on `/feed/[slug]` detail pages** — below the build
   brief, only when the drop's tags intersect a partner's `matchTags`. One
   partner max per page. Priority order: Slatebase hosting tags, then Brink
   usage tags. If no tag matches, render nothing — no generic fallback here.

## 4. Data model

Two partners, changes rarely — a typed config file, not a DB table or migration.

```ts
// lib/ecosystem/partners.ts
export type EcosystemPartner = {
  id: 'slatebase' | 'brink';
  name: string;
  oneLiner: string;
  url: string;            // TODO: confirm real URL — placeholder below
  accentColor: string;    // TODO: confirm real brand color — placeholder below
  matchTags: string[];    // must match real idea_drops.tags values
  ctaLabel: string;
};

export const ECOSYSTEM_PARTNERS: EcosystemPartner[] = [
  {
    id: 'slatebase',
    name: 'Slatebase',
    oneLiner: 'Host your AI models without babysitting infra.', // TODO: confirm copy
    url: 'https://slatebase.TODO',
    accentColor: '#22D3AA', // placeholder teal — distinct from Sourced violet
    matchTags: ['hosting', 'deployment', 'inference', 'self-hosted', 'llm-ops'],
    ctaLabel: 'Explore Slatebase',
  },
  {
    id: 'brink',
    name: 'Brink',
    oneLiner: 'Know what your AI usage costs before the bill does.', // TODO: confirm copy
    url: 'https://brink.TODO',
    accentColor: '#F5A623', // placeholder amber
    matchTags: ['rate-limits', 'api-cost', 'usage-tracking', 'billing', 'monitoring'],
    ctaLabel: 'Try Brink',
  },
];
```

**Do not ship the TODOs live.** URLs, copy, brand colors, and `matchTags` are
my placeholders so the spec is buildable today — swap in real values before
this goes to production.

## 5. Components to build

| Component | Purpose |
|---|---|
| `components/ecosystem/EcosystemChip.tsx` | Footer chip — icon dot in accent color + name + truncated one-liner (full text on hover/title). |
| `components/ecosystem/EcosystemCard.tsx` | Feed card matching `IdeaDropCard` dimensions/type scale, but with a "From the ecosystem" eyebrow chip instead of demand-score, one-liner instead of problem summary, CTA button instead of "View brief." |
| `components/ecosystem/EcosystemBanner.tsx` | Detail-page inline banner — horizontal bar, icon + one-liner + CTA, sits below the build brief, above the footer. |
| `app/ecosystem/page.tsx` | Dedicated page — hero ("Tools we actually use"), one full-width section per partner (one-liner, feature bullets — TODO, CTA). |
| `lib/ecosystem/matching.ts` | `pickPartnerForTags(tags: string[]): EcosystemPartner \| null` — priority Slatebase → Brink, `null` if no match. |
| `lib/ecosystem/feedInjection.ts` | Takes the feed's drop array, returns `{type:'drop', data} \| {type:'ecosystem', data}[]`, inserting one ecosystem card every 6 real drops, alternating partners. Skip injection entirely if the feed has fewer than 6 drops — don't dilute a thin feed. |

## 6. Analytics

Reuse the existing `events` table already in the Sourced schema. Add:

- `ecosystem_impression` — once per session per placement/partner (footer chip
  counts once per session, not per page nav, to avoid inflating counts)
- `ecosystem_click` — on CTA/link click, payload `{ partner_id, placement }`
  where `placement ∈ footer | ecosystem_page | feed_card | detail_banner`

This is what tells you later which placement is actually driving traffic
before investing further in any one of them.

## 7. Copy and assets needed before this ships (blocking)

- Confirmed one-liners for both products
- Confirmed URLs
- Confirmed brand accent colors, or explicit sign-off to keep the two
  placeholder colors above
- 2–3 feature bullets per product for the `/ecosystem` page

## 8. Image prompts (icon marks + `/ecosystem` OG image)

No existing brand identity on file for either product, so these produce
simple geometric marks that sit inside Sourced's design system (dark
background #0A0A0F, Space Grotesk, violet #7C3AED already established) while
giving each partner a distinguishable accent color. Swap for real brand marks
the moment they exist.

1. **Slatebase icon mark** (32×32, transparent background): "A minimal
   geometric icon mark for a developer tool, transparent background, single
   flat shape only, no text, no gradients — a stacked-layers or server-rack
   motif rendered in a single teal color (#22D3AA), rounded corners, 2px
   stroke weight, favicon-scale visual weight."
2. **Brink icon mark** (32×32, transparent background): "A minimal geometric
   icon mark for a developer tool, transparent background, single flat shape
   only, no text, no gradients — a gauge/dial or threshold-line motif
   rendered in a single amber color (#F5A623), rounded corners, 2px stroke
   weight, favicon-scale visual weight."
3. **`/ecosystem` OG image** (1200×630): "Dark near-black background
   (#0A0A0F), three small geometric icon marks arranged left to right
   connected by thin glowing lines — violet mark, teal mark, amber mark —
   Space Grotesk-style geometric sans-serif wordmark 'The Ecosystem' centered
   below, minimal, Linear/Vercel aesthetic, no photographic elements."

## 9. Build order

1. `lib/ecosystem/partners.ts` + `matching.ts` + `feedInjection.ts` — pure
   logic, no UI, fastest to unit-test.
2. `EcosystemChip` + footer wiring — smallest surface, ships first, gets
   impressions immediately.
3. `/ecosystem` page — self-contained route, no interaction with existing
   feed logic.
4. `EcosystemCard` + feed injection — touches `/feed` rendering; read the
   existing `IdeaDropCard` component first so visual parity is exact, not
   approximated.
5. `EcosystemBanner` + detail-page tag matching — lowest priority, depends on
   `idea_drops.tags` actually being populated meaningfully; verify tag
   coverage before building this one.
6. Analytics events — wired last, once placements exist to measure.

## 10. Out of scope

- Payment/affiliate tracking between the three products — no indication yet
  this needs to be a paid arrangement vs. a courtesy cross-promotion.
- Slatebase's or Brink's own landing pages — this spec only covers what
  renders on Sourced.
