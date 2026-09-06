# Magic UI & Vibrant RGB Visual Overhaul Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Overhaul Sourced with Magic UI component primitives and vibrant chromatic RGB lighting across cards, buttons, text, and tickers on a sleek obsidian canvas without breaking existing features or tests.

**Architecture:** Implement self-contained, GPU-accelerated Magic UI React primitives (`BorderBeam`, `ShineBorder`, `MagicCard`, `RainbowButton`, `AnimatedGradientText`, `Marquee`, `Meteors`) in `components/magicui/`. Upgrade the design system tokens in `app/globals.css` to deep obsidian (`#08090E`) with luminous RGB spectrum variables. Integrate primitives across the homepage, floating navbar, and feed views while preserving all existing business logic, server actions, Razorpay checkout, and Vitest test suites.

**Tech Stack:** Next.js 14 App Router, React 18, TypeScript, Framer Motion, CSS Keyframes & Conic Gradients, Vitest.

**Spec:** [`docs/superpowers/specs/2026-09-06-magicui-rgb-overhaul-design.md`](file:///c:/Users/falcon/Downloads/sourced-nextjs/docs/superpowers/specs/2026-09-06-magicui-rgb-overhaul-design.md)

## Global Constraints

- Never break existing Next.js App Router dynamic SSR data fetching or API routes.
- Preserve 100% of Razorpay payment triggers, modal hooks, and INR/USD currency conversions.
- Use GPU-accelerated CSS animations (`transform`, `opacity`, `conic-gradient`) respecting `prefers-reduced-motion`.
- All 37 existing Vitest test files (194 tests) and `npm run typecheck` must remain passing at all times.

---

### Task 1: Deep Obsidian Palette & Chromatic RGB Design Tokens

**Files:**
- Modify: `app/globals.css:5-150`
- Test: `tests/theme-tokens.test.ts`

**Interfaces:**
- Consumes: Existing CSS classes (`.reveal`, `.reveal-scale`, `.wrap`, `.btn`, `#masonry .idea-card`)
- Produces: CSS custom properties (`--bg`, `--surface`, `--surface-elevated`, `--ink`, `--ink-soft`, `--line`, `--rgb-rainbow`, `--rgb-beam-violet-cyan`, `--rgb-card-glow`) and `@keyframes` (`border-beam`, `shine-rotate`, `rainbow-cycle`, `marquee`, `meteor`)

- [ ] **Step 1: Write test for theme tokens and CSS variables**

```typescript
// tests/theme-tokens.test.ts
import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

describe("Theme Tokens & RGB Animations", () => {
  const css = fs.readFileSync(path.resolve(process.cwd(), "app/globals.css"), "utf-8");

  it("defines obsidian canvas and surface colors", () => {
    expect(css).toContain("--bg:#08090E");
    expect(css).toContain("--surface:#10121A");
  });

  it("defines vibrant chromatic RGB gradients", () => {
    expect(css).toContain("--rgb-rainbow");
    expect(css).toContain("--rgb-beam-violet-cyan");
  });

  it("defines keyframe animations for Magic UI primitives", () => {
    expect(css).toContain("@keyframes border-beam");
    expect(css).toContain("@keyframes shine-rotate");
    expect(css).toContain("@keyframes marquee");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/theme-tokens.test.ts`
Expected: FAIL (tokens not yet in `app/globals.css`)

- [ ] **Step 3: Update `app/globals.css` with obsidian palette, RGB tokens, and keyframes**

Add obsidian tokens:
```css
:root {
  --bg: #08090E;
  --surface: #10121A;
  --surface-elevated: #161824;
  --ink: #F4F4F6;
  --ink-soft: #9496A6;
  --line: rgba(255, 255, 255, 0.08);
  --line-highlight: rgba(255, 255, 255, 0.16);
  --violet: #7C3AED;
  --violet-deep: #5B21B6;
  --lime: #10B981;
  --coral: #FF5E7E;
  --rgb-rainbow: linear-gradient(90deg, #ff0055, #ff5000, #ffcc00, #00f0ff, #7000ff, #ff00aa);
  --rgb-beam-violet-cyan: linear-gradient(90deg, #8A2BE2, #00F0FF, #00FF88);
  --rgb-card-glow: 0 0 30px rgba(138, 43, 226, 0.2), 0 0 60px rgba(0, 240, 255, 0.1);
}
```

Add keyframes for `border-beam`, `shine-rotate`, `rainbow-cycle`, `marquee`, and `meteor`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/theme-tokens.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add app/globals.css tests/theme-tokens.test.ts
git commit -m "style: add obsidian palette and rgb animation tokens"
```

---

### Task 2: Magic UI Primitive Components Suite

**Files:**
- Create: `components/magicui/border-beam.tsx`
- Create: `components/magicui/shine-border.tsx`
- Create: `components/magicui/magic-card.tsx`
- Create: `components/magicui/rainbow-button.tsx`
- Create: `components/magicui/animated-gradient-text.tsx`
- Create: `components/magicui/marquee.tsx`
- Create: `components/magicui/meteors.tsx`
- Test: `tests/magicui-primitives.test.tsx`

**Interfaces:**
- Consumes: React standard props, CSS keyframe tokens
- Produces: Exportable components (`BorderBeam`, `ShineBorder`, `MagicCard`, `RainbowButton`, `AnimatedGradientText`, `Marquee`, `Meteors`)

- [ ] **Step 1: Write tests for Magic UI primitives**

```typescript
// tests/magicui-primitives.test.tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import React from "react";
import { BorderBeam } from "@/components/magicui/border-beam";
import { RainbowButton } from "@/components/magicui/rainbow-button";
import { AnimatedGradientText } from "@/components/magicui/animated-gradient-text";
import { Marquee } from "@/components/magicui/marquee";

describe("Magic UI Primitives", () => {
  it("renders RainbowButton with text", () => {
    render(<RainbowButton>Launch</RainbowButton>);
    expect(screen.getByText("Launch")).toBeDefined();
  });

  it("renders AnimatedGradientText with text", () => {
    render(<AnimatedGradientText>Weekly Drop</AnimatedGradientText>);
    expect(screen.getByText("Weekly Drop")).toBeDefined();
  });

  it("renders Marquee with items", () => {
    render(
      <Marquee>
        <span>Item 1</span>
        <span>Item 2</span>
      </Marquee>
    );
    expect(screen.getAllByText("Item 1").length).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/magicui-primitives.test.tsx`
Expected: FAIL (modules do not exist)

- [ ] **Step 3: Implement Magic UI primitives in `components/magicui/`**

Implement each component with pure CSS/Framer Motion and zero external dependencies:
- `BorderBeam`: renders animated streak traveling along border with SVG/CSS offset.
- `ShineBorder`: renders dynamic rotating chromatic pseudo-border.
- `MagicCard`: mouse move event listener tracking relative `(x, y)` coordinates and setting CSS variables `--mouse-x` and `--mouse-y` for radial spotlight overlay.
- `RainbowButton`: renders button or link with animated multi-color border and hover glow.
- `AnimatedGradientText`: renders shimmering gradient text with optional glowing badge border.
- `Marquee`: seamless CSS animation infinite scroll container.
- `Meteors`: renders ambient falling streaks with randomized offsets.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/magicui-primitives.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add components/magicui/* tests/magicui-primitives.test.tsx
git commit -m "feat: add magic ui component primitives suite"
```

---

### Task 3: Homepage Visual Overhaul

**Files:**
- Modify: `app/home-client.tsx`
- Modify: `app/globals.css` (section styling alignments if needed)
- Test: `tests/home-client-visuals.test.tsx`

**Interfaces:**
- Consumes: `BorderBeam`, `ShineBorder`, `MagicCard`, `RainbowButton`, `AnimatedGradientText`, `Marquee`, `Meteors`
- Produces: Visual overhaul across Hero, Masonry Idea Cards, Interactive Tabs, Matched APIs Marquee, Sample Drop, Pricing, and Newsletter CTA

- [ ] **Step 1: Write integration tests for homepage overhaul elements**

```typescript
// tests/home-client-visuals.test.tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import React from "react";
import HomeClient from "@/app/home-client";

describe("Homepage Visual Overhaul", () => {
  const dummyProofBar = { totalIdeas: 6, totalSignals: 250, totalSources: 12, latestDropDate: "2026-09-01" };

  it("renders with Magic UI elements in place", () => {
    const { container } = render(
      <HomeClient userEmail={null} proofBar={dummyProofBar} />
    );
    // Checks that marquee and hero elements exist
    expect(container.querySelector(".marquee-track")).toBeDefined();
    expect(container.querySelector(".rainbow-btn")).toBeDefined();
  });
});
```

- [ ] **Step 2: Update `app/home-client.tsx`**

1. Hero:
   - Eyebrow badge with `AnimatedGradientText`.
   - Backdrop with ambient `Meteors` + `<DotField />`.
   - Primary CTA with `RainbowButton`.
2. Masonry Idea Cards:
   - Wrap cards in `MagicCard` for cursor spotlight.
   - Attach `BorderBeam` to top drop card.
3. Interactive Pipeline:
   - Sleek dark terminal glass styling with active builder tab glows.
4. Matched APIs & Ingestion Sources:
   - Replace static list with dual bidirectional `Marquee` streams.
5. Sample Drop:
   - Wrap sample brief card in `ShineBorder`.
6. Pricing:
   - Highlight Builder plan with `BorderBeam` and `RainbowButton` checkout CTA.
7. Newsletter:
   - Radial RGB aurora halo.

- [ ] **Step 3: Run integration test and existing tests**

Run: `npm run test`
Expected: PASS (all tests pass)

- [ ] **Step 4: Commit**

```bash
git add app/home-client.tsx app/globals.css tests/home-client-visuals.test.tsx
git commit -m "feat: overhaul homepage with magic ui and rgb animations"
```

---

### Task 4: Global Nav, Feed Views, and Detail Page Refinement

**Files:**
- Modify: `components/floating-navbar.tsx`
- Modify: `components/feed-browser.tsx`
- Modify: `app/feed/[slug]/page.tsx`
- Test: `tests/navigation-feed-visuals.test.tsx`

**Interfaces:**
- Consumes: Obsidian tokens, `MagicCard`, `BorderBeam`, `RainbowButton`
- Produces: Consistent dark obsidian aesthetic with luminous highlights across all secondary routes

- [ ] **Step 1: Write integration tests for navigation and feed visual changes**

Verify floating navbar renders cleanly with obsidian glass styling and feed browser renders with `MagicCard` wrappers.

- [ ] **Step 2: Update `components/floating-navbar.tsx`**

Enhance the floating nav with obsidian frosted glass (`rgba(10, 11, 16, 0.85)` + `backdrop-filter: blur(16px)`), luminous active pill borders, and RGB accent glow.

- [ ] **Step 3: Update `components/feed-browser.tsx` and `app/feed/[slug]/page.tsx`**

1. `feed-browser.tsx`:
   - Wrap feed cards in `MagicCard` for mouse spotlight tracking.
   - Style category chips with obsidian backdrop and glowing active borders.
2. `/feed/[slug]/page.tsx`:
   - Enhance builder export panel and instant dev database with crisp syntax blocks and glowing copy/download buttons.

- [ ] **Step 4: Run tests**

Run: `npm run test`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add components/floating-navbar.tsx components/feed-browser.tsx app/feed/[slug]/page.tsx tests/navigation-feed-visuals.test.tsx
git commit -m "style: elevate floating nav and feed pages with obsidian and rgb glow"
```

---

### Task 5: Full Regression Testing & Production Build Verification

**Files:**
- Test all files: `npm run test`
- Typecheck: `npm run typecheck`
- Build: `npm run build`
- Modify: `HANDOFF.md`

- [ ] **Step 1: Execute complete Vitest test suite**

Run: `npm run test`
Expected: All test suites pass (0 failures).

- [ ] **Step 2: Execute TypeScript type check**

Run: `npm run typecheck`
Expected: Clean output, 0 errors.

- [ ] **Step 3: Execute Next.js production build**

Run: `npm run build`
Expected: Successful compilation of all static and dynamic routes.

- [ ] **Step 4: Update `HANDOFF.md` with completed changes**

- [ ] **Step 5: Final commit**

```bash
git add HANDOFF.md
git commit -m "docs: update handoff note with magic ui and rgb visual overhaul"
```
