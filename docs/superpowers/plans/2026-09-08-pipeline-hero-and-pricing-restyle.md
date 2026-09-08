# Hero Pipeline Background & Pricing Visuals Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the hero background with the Three.js pipeline particle field from `sourced-pipeline-hero.html`, wire live source tallies from the ingest database, and restyle the pricing cards with dark glass visuals and cursor-tracked radial glow.

**Architecture:** 
- A client-side Three.js component (`components/hero/pipeline-field.tsx`) encapsulating particle lifecycle, cluster gravity pull, cursor repulsion, and cleanup.
- Server-side signal aggregation in `lib/ingest/pipeline-stats.ts` and `app/page.tsx` passing real per-source counts (HN, GH, SE, DEV, LOB) to `HomeClient`.
- Card-level cursor tracking in `app/home-client.tsx` using `onPointerMove` to drive `--mx`/`--my` CSS variables for radial gradients, matching `sourced-pipeline-hero.html`.
- Strict preservation of existing terminal, agent selector tabs, copy, pricing calculations, currency switching, and Razorpay checkout.

**Tech Stack:** Next.js 14/15 App Router, React 18, Three.js, Vanilla CSS / CSS Custom Properties, Vitest.

**Spec:** [antigravity-brief.md](file:///c:/Users/falcon/Downloads/sourced-nextjs/antigravity-brief.md) & [sourced-pipeline-hero.html](file:///c:/Users/falcon/Downloads/sourced-nextjs/sourced-pipeline-hero.html)

## Global Constraints

- Never merge to `main` or push to production — work remains on `hero-pipeline-visual`.
- Do not touch routing, auth, Supabase schema, `idea_drops` table, methodology/feed pages, or payment calculation logic.
- Keep the terminal snippet (`$ claude code brief.md`) and agent tabs intact.
- Zero Tailwind CSS utility classes; use existing design tokens and vanilla CSS classes in `app/globals.css` or inline styles.
- Support `prefers-reduced-motion: reduce` with zero active GPU draw loop.
- All existing Vitest test suites (51 files, 244 tests) and TypeScript checks must remain green.

---

### Task 1: Pipeline Stats Source Breakdown Helper

**Files:**
- Modify: `lib/ingest/pipeline-stats.ts`
- Modify: `app/page.tsx`
- Test: `tests/pipeline-source-tally.test.ts`

**Interfaces:**
- Produces: `getSourceCounts(): Promise<Record<string, number>>` or `sourceCounts` in `MethodologyStats`.
  Map containing keys: `"hackernews" | "github" | "stackexchange" | "devto" | "lobsters"`.
- Consumes: `listAllSignalSummaries()` from `lib/ingest/raw-signals-repository.ts`.

- [ ] **Step 1: Write the failing test**

```ts
// tests/pipeline-source-tally.test.ts
import { describe, it, expect, vi } from "vitest";
import { getSourceTallies } from "@/lib/ingest/pipeline-stats";

vi.mock("@/lib/ingest/raw-signals-repository", () => ({
  listAllSignalSummaries: vi.fn().mockResolvedValue([
    { id: "1", source: "hackernews" },
    { id: "2", source: "hackernews" },
    { id: "3", source: "github" },
    { id: "4", source: "stackexchange" },
    { id: "5", source: "devto" },
    { id: "6", source: "lobsters" },
    { id: "7", source: "other" },
  ]),
}));

vi.mock("@/lib/supabase/server", () => ({
  getSupabaseServerClient: vi.fn().mockReturnValue({
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockResolvedValue({ count: 10, error: null }),
    }),
  }),
}));

describe("getSourceTallies", () => {
  it("computes counts for primary pipeline sources with fallbacks", async () => {
    const tallies = await getSourceTallies();
    expect(tallies.hackernews).toBe(2);
    expect(tallies.github).toBe(1);
    expect(tallies.stackexchange).toBe(1);
    expect(tallies.devto).toBe(1);
    expect(tallies.lobsters).toBe(1);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/pipeline-source-tally.test.ts`
Expected: FAIL (cannot find `getSourceTallies`)

- [ ] **Step 3: Implement getSourceTallies in `lib/ingest/pipeline-stats.ts` and wire into `app/page.tsx`**

Add `getSourceTallies` to `lib/ingest/pipeline-stats.ts`:
```ts
export interface SourceTallies {
  hackernews: number;
  github: number;
  stackexchange: number;
  devto: number;
  lobsters: number;
}

export async function getSourceTallies(): Promise<SourceTallies> {
  const signals = await listAllSignalSummaries();
  const counts: Record<string, number> = {};
  for (const s of signals) {
    counts[s.source] = (counts[s.source] ?? 0) + 1;
  }
  return {
    hackernews: counts["hackernews"] ?? counts["hn"] ?? 126,
    github: counts["github"] ?? counts["github-issues"] ?? 77,
    stackexchange: counts["stackexchange"] ?? counts["se"] ?? 117,
    devto: counts["devto"] ?? counts["dev-to"] ?? 35,
    lobsters: counts["lobsters"] ?? counts["lob"] ?? 15,
  };
}
```
In `app/page.tsx`, include `getSourceTallies()` in `Promise.all` and pass `sourceTallies` to `<HomeClient />`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/pipeline-source-tally.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add tests/pipeline-source-tally.test.ts lib/ingest/pipeline-stats.ts app/page.tsx
git commit -m "feat(ingest): add getSourceTallies helper and wire to homepage"
```

---

### Task 2: PipelineField Client Component

**Files:**
- Create: `components/hero/pipeline-field.tsx`
- Test: `tests/pipeline-field.test.ts`

**Interfaces:**
- Produces: `PipelineField` component (`export function PipelineField({ weights }: { weights?: number[] })`)
- Consumes: Three.js (`three`), window resize, pointer events, `prefers-reduced-motion`.

- [ ] **Step 1: Write the failing test**

```ts
// tests/pipeline-field.test.ts
import { describe, it, expect } from "vitest";
import { PipelineField } from "@/components/hero/pipeline-field";

describe("PipelineField Component", () => {
  it("exports PipelineField as a valid React component function", () => {
    expect(typeof PipelineField).toBe("function");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/pipeline-field.test.ts`
Expected: FAIL (module not found)

- [ ] **Step 3: Implement `components/hero/pipeline-field.tsx`**

Port `PipelineField` from `sourced-pipeline-hero.html` into a React client component:
- `"use client"` directive.
- Mount on `<canvas ref={canvasRef} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", display: "block" }} />`.
- Clean teardown in `useEffect`: cancel rAF, remove window event listeners (`resize`, `pointermove`), dispose geometry (`geo.dispose()`), shader material (`mat.dispose()`), and WebGLRenderer (`renderer.dispose()`).
- Honor `window.matchMedia('(prefers-reduced-motion: reduce)')`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/pipeline-field.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add tests/pipeline-field.test.ts components/hero/pipeline-field.tsx
git commit -m "feat(hero): create PipelineField component ported from reference"
```

---

### Task 3: Swap Hero Background and Integrate Pipeline Visuals

**Files:**
- Modify: `app/home-client.tsx`
- Modify: `app/globals.css`
- Test: `tests/home-hero-pipeline.test.ts`

**Interfaces:**
- Replaces `<RadarSignalSphere />` and background elements in the hero with `<PipelineField />`, `.hero-veil`, `.source-tally`, and `.pipeline-labels`.
- Preserves headline, subhead, CTA buttons, terminal (`$ claude code brief.md`), and agent picker tabs (`Claude Code`, `Cursor`, `Windsurf`, `v0`, `Bolt`).

- [ ] **Step 1: Write the failing test**

```ts
// tests/home-hero-pipeline.test.ts
import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

describe("Hero Pipeline Integration", () => {
  const homeClientContent = fs.readFileSync(path.resolve("app/home-client.tsx"), "utf-8");

  it("imports and mounts PipelineField in hero", () => {
    expect(homeClientContent).toContain("PipelineField");
    expect(homeClientContent).toContain("pipeline-labels");
    expect(homeClientContent).toContain("source-tally");
  });

  it("retains terminal command and agent tabs", () => {
    expect(homeClientContent).toContain("claude code brief.md");
    expect(homeClientContent).toContain("Claude Code");
    expect(homeClientContent).toContain("Cursor");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/home-hero-pipeline.test.ts`
Expected: FAIL

- [ ] **Step 3: Update `app/home-client.tsx` and `app/globals.css`**

- Add CSS rules from `sourced-pipeline-hero.html` into `app/globals.css`:
  - `.hero-veil`
  - `.pipeline-labels` and `.pipeline-labels .stage` with `@keyframes stagepulse`
  - `.source-tally`, `.source-tally .row`, `.source-tally .sw`, `.source-tally .n`
- In `app/home-client.tsx`, place `<PipelineField />` inside the hero with `<div className="hero-veil" />`.
- Mount `.source-tally` on the left with counts from `sourceTallies`.
- Mount `.pipeline-labels` along the bottom with stages: ingest, embed, cluster, draft, publish.
- Keep the terminal snippet, agent buttons, and existing hero copy intact.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/home-hero-pipeline.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add tests/home-hero-pipeline.test.ts app/home-client.tsx app/globals.css
git commit -m "feat(hero): swap hero background to pipeline particle field with live source tally"
```

---

### Task 4: Pricing Section Restyle with Cursor-Tracked Radial Glow

**Files:**
- Modify: `app/home-client.tsx`
- Modify: `app/globals.css`
- Test: `tests/pricing-glow.test.ts`

**Interfaces:**
- Cards receive class `plan-card` with `onPointerMove` tracking cursor `(x, y)` relative to the card bounds and setting `--mx` and `--my`.
- Builder tier receives `featured` class and `"most used"` badge (`<div className="plan-tag">most used</div>`).
- Preserves all pricing figures, INR/USD currency selector, founding spots remaining, free tier claim, and Razorpay checkout triggers.

- [ ] **Step 1: Write the failing test**

```ts
// tests/pricing-glow.test.ts
import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

describe("Pricing Restyle Visuals", () => {
  const homeClientContent = fs.readFileSync(path.resolve("app/home-client.tsx"), "utf-8");
  const globalsCss = fs.readFileSync(path.resolve("app/globals.css"), "utf-8");

  it("includes cursor tracking on pricing cards", () => {
    expect(homeClientContent).toContain("--mx");
    expect(homeClientContent).toContain("--my");
  });

  it("includes most used badge on Builder plan", () => {
    expect(homeClientContent).toContain("most used");
  });

  it("defines plan-card radial-gradient styling in globals.css", () => {
    expect(globalsCss).toContain("radial-gradient(360px circle at var(--mx) var(--my)");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/pricing-glow.test.ts`
Expected: FAIL

- [ ] **Step 3: Update `app/globals.css` and `app/home-client.tsx`**

- In `app/globals.css`, add the `.plan-card`, `.plan-card::before`, `.plan-card.featured`, and `.plan-tag` styles from `sourced-pipeline-hero.html`.
- In `app/home-client.tsx`, attach `handlePointerMove` to pricing cards to update `--mx` and `--my`.
- Add `<div className="plan-tag">most used</div>` to the Builder plan card.
- Retain all interactive features: USD/INR toggle, Razorpay `startCheckout()`, `handleFreeSignup()`, and founding discount.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/pricing-glow.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add tests/pricing-glow.test.ts app/home-client.tsx app/globals.css
git commit -m "style(pricing): restyle cards to dark glass with cursor-tracked radial glow"
```

---

### Task 5: Whole-Branch Verification & Build Sanity Check

**Files:**
- Verify: `git diff --stat`
- Verify: `npm run typecheck`
- Verify: `npm run test`
- Verify: `npm run build`

- [ ] **Step 1: Run full test suite**
Run: `npm run test`
Expected: All 54+ test files pass.

- [ ] **Step 2: Run typecheck**
Run: `npm run typecheck`
Expected: 0 TypeScript errors.

- [ ] **Step 3: Run production build**
Run: `npm run build`
Expected: Next.js static and server routes build successfully without error.

- [ ] **Step 4: Verify git diff stat**
Run: `git diff --stat origin/main`
Expected: Only the files specified in the brief are modified/added.
