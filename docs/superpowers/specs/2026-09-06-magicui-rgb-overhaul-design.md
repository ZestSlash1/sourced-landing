# Magic UI & Vibrant RGB Visual Overhaul Design

- **Date:** 2026-09-06
- **Status:** Approved
- **Target:** Sourced (Next.js 14 App Router, getsourced.dev)

## 1. Executive Summary
Transform Sourced with an aesthetic overhaul inspired by **Magic UI** (`https://magicui.design`) and vibrant chromatic RGB lighting effects across borders, interactive cards, buttons, text, and tickers. The overhaul transitions the landing page to a sleek, deep obsidian canvas (`#08090E`) to maximize dynamic range, while preserving all existing business logic, server-side data fetching, international currency handling, Razorpay checkout, database exporters, and 100% test suite compatibility.

---

## 2. Design System & Theming Architecture

### 2.1 Color & Surface Palette (`app/globals.css`)
- **Canvas Base (`--bg`)**: `#08090E` (Deep obsidian)
- **Surface (`--surface`)**: `#10121A` (Primary dark card background)
- **Elevated Surface (`--surface-elevated`)**: `#161824` (Modals, elevated cards, popovers)
- **Text Primary (`--ink`)**: `#F4F4F6` (High-contrast crisp white)
- **Text Muted (`--ink-soft`)**: `#9496A6` (Cool gray secondary text)
- **Borders (`--line`)**: `rgba(255, 255, 255, 0.08)` (Subtle hairline dividers)
- **Border Highlight (`--line-highlight`)**: `rgba(255, 255, 255, 0.16)`

### 2.2 Chromatic RGB Spectrum & Lighting Tokens
- **`--rgb-rainbow`**: `linear-gradient(90deg, #ff0055, #ff5000, #ffcc00, #00f0ff, #7000ff, #ff00aa)`
- **`--rgb-conic-rainbow`**: `conic-gradient(from 0deg, #ff0055, #ff7700, #ffea00, #00f0ff, #8a2be2, #ff0077, #ff0055)`
- **`--rgb-beam-violet-cyan`**: `linear-gradient(90deg, #8A2BE2, #00F0FF, #00FF88)`
- **`--rgb-card-glow`**: `0 0 30px rgba(138, 43, 226, 0.2), 0 0 60px rgba(0, 240, 255, 0.1)`
- **`--rgb-halo-radial`**: `radial-gradient(circle at 50% 0%, rgba(138, 43, 226, 0.25) 0%, rgba(0, 240, 255, 0.08) 50%, transparent 80%)`

---

## 3. Magic UI Primitive Suite (`components/magicui/*`)

### 3.1 `BorderBeam` (`components/magicui/border-beam.tsx`)
- Traces the outer perimeter of a container with an animated traveling streak of RGB light.
- Uses CSS `@keyframes` with `offset-path` or rotating masked conic gradient for zero-jank GPU rendering.
- Props: `size` (px), `duration` (s), `delay` (s), `colorFrom`, `colorTo`, `className`.

### 3.2 `ShineBorder` (`components/magicui/shine-border.tsx`)
- Continuous 360° rotating chromatic RGB edge glow surrounding featured elements.
- Implemented with an animated rotating conic gradient mask on a pseudo-border layer.
- Props: `borderRadius`, `borderWidth`, `duration`, `color` (array of RGB stops).

### 3.3 `MagicCard` (`components/magicui/magic-card.tsx`)
- An interactive spotlight card wrapper.
- Tracks cursor coordinates (`pointermove`) and projects a soft radial RGB glow following the user's cursor.
- Automatically handles touch devices and preserves all card click handlers and nested links.
- Props: `gradientColor`, `gradientSize`, `gradientOpacity`, `className`, `children`.

### 3.4 `RainbowButton` (`components/magicui/rainbow-button.tsx`)
- High-impact call-to-action button with an animated circulating multi-color gradient border and ambient neon drop shadow.
- Supports both standard `<button>` and Next.js `<Link>` wrappers.
- Props: `href`, `onClick`, `children`, `className`.

### 3.5 `AnimatedGradientText` (`components/magicui/animated-gradient-text.tsx`)
- Renders text with a continuously shifting chromatic gradient using `background-clip: text`.
- Includes an optional luminous border pill wrapper for eyebrow badges.
- Props: `children`, `className`, `shimmerWidth`.

### 3.6 `Marquee` (`components/magicui/marquee.tsx`)
- Hardware-accelerated infinite horizontal scrolling ticker.
- Seamless looping using CSS transforms. Supports `reverse`, `pauseOnHover`, `vertical`, and variable speed.
- Props: `className`, `reverse`, `pauseOnHover`, `children`, `repeat`.

### 3.7 `Meteors` (`components/magicui/meteors.tsx`)
- Renders subtle glowing meteor streaks that travel diagonally downward across the hero backdrop.
- Uses randomized positions and animation delays.
- Props: `number`, `className`.

---

## 4. Homepage Section Integration (`app/home-client.tsx`)

### 4.1 Hero Section (`#hero`)
- **Eyebrow**: Replaced with `AnimatedGradientText` wrapped in a glowing pill badge ("⚡ VERIFIED DROPS EVERY MONDAY MORNING").
- **Atmosphere**: Deep obsidian background with `<DotField />` canvas layered with subtle `Meteors` and a soft violet-cyan ambient radial bloom.
- **Primary CTA**: Upgraded to `RainbowButton` ("Browse Verified Drops ⚡").

### 4.2 Masonry Idea Cards (`#masonry`)
- Every card transformed into an interactive `MagicCard` with cursor spotlighting.
- The highest-demand drop (`Client-ready P&L exports for solo bookkeepers`) receives an active `BorderBeam` traveling along its perimeter.
- Demand score and category chips receive luminous glowing borders.

### 4.3 Interactive AI Builder Engine (`#how`)
- Builder tabs (Claude Code, Cursor, Windsurf, v0, Bolt) get glowing active indicators.
- The CLI command snippet panel receives a dark glass terminal frame with illuminated RGB hairline borders.

### 4.4 Matched APIs & Platform Sources (`#apis`)
- Converted into dual bidirectional `Marquee` streams:
  - Row 1: Key public APIs (Open Exchange Rates, REST Countries, Numverify, PDFShift, IPify).
  - Row 2: Real ingestion sources (Hacker News, GitHub Issues, GitLab, YouTube, Bluesky, DevRant).
- Chips pause smoothly on mouse hover and feature glowing border highlights.

### 4.5 Weekly Sample Drop Showcase (`#sample`)
- Enclosed within a `ShineBorder` with continuous chromatic rotation.
- Code blocks and schema previews render on deep obsidian cards with syntax-highlighted accents.

### 4.6 Pricing Matrix (`#pricing`)
- **Builder Tier (Hero offer)**: Highlighted with an animated `BorderBeam`, iridescent "Most Popular" chip, and `RainbowButton` checkout trigger.
- **Currency Switcher**: `[USD ($) | INR (₹)]` styled in dark obsidian glass with glowing active pill indicator.

### 4.7 Newsletter & Footer (`#subscribe`)
- Enclosed with a subtle RGB aurora halo backdrop and iridescent submit action.

---

## 5. Global Navigation & Feed Views

### 5.1 Global Floating Nav (`components/floating-navbar.tsx`)
- Dark glass container (`rgba(10, 11, 16, 0.85)` + `backdrop-filter: blur(16px)`).
- Active item indicator accented with a subtle iridescent RGB glow.
- Retains Lenis scroll elevation (`navbarPillElevate`).

### 5.2 Feed Browser & Detail Pages (`components/feed-browser.tsx`, `app/feed/[slug]/page.tsx`)
- Search bar and category filter pills styled with obsidian surfaces and glowing active states.
- Feed cards wrap in `MagicCard` for spotlight cursor tracking.
- Builder export panels (CLAUDE.md, .cursorrules, schema.sql, Instant DB) styled in high-contrast dark glass with glowing copy actions.

---

## 6. Non-Breaking Invariants & Verification

- **Razorpay Checkout**: Seamless payment modal trigger for INR / USD pricing without modifying any payment handlers.
- **Dynamic International Pricing**: Preserved geo-detection and real-time currency conversion.
- **SSR & SEO**: Next.js App Router dynamic data loaders (`listFeaturedIdeas`, `listPublishedIdeas`, `getMethodologyStats`), canonical tags, and JSON-LD stay 100% intact.
- **Performance**: 120fps GPU animations, zero layout shifts, strict `prefers-reduced-motion` compliance.
- **Test Integrity**: Full Vitest test suite (37 files, 194 tests) and TypeScript type check (`tsc --noEmit`) must remain green.
