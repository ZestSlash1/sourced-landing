# React Three Fiber (R3F) 3D Visual Architecture Design

**Date:** 2026-09-08  
**Status:** Approved  
**Branch:** `prototype/r3f-3d-visuals` (Prototype tree, isolated from `main`)

---

## 1. Overview & Goal
Enhance Sourced's visual polish and developer experience by introducing `@react-three/fiber` and Three.js across key user surfaces without sacrificing load performance, battery life, or Core Web Vitals.

The 3D design follows a targeted, high-impact architecture:
1. **Hero Section**: An interactive 3D **Radar Signal Sphere** displaying rotating orbital telemetry, latitude wireframes, and live-ping signal nodes from real ingested sources (Hacker News, GitHub, App Store, Discourse).
2. **Drop Detail Page (`/feed/[slug]`)**: An interactive 3D **Solution Node Graph** illustrating multi-platform complaints converging into a verified micro-SaaS architecture.
3. **Cards (Homepage Masonry & Feed)**: Lightweight hardware-accelerated **CSS 3D perspective tilt & cursor specular sheen**, preserving 60/120fps scrolling across 100+ cards without multiple WebGL context overhead.

---

## 2. Technical Stack & Dependencies
- `three`: `^0.160.0` (Core 3D engine)
- `@react-three/fiber`: `^8.17.10` (React 18 LTS compatible reconciler)
- `@react-three/drei`: `^9.100.0` (Camera, interaction, geometry primitives)
- `@types/three`: Type definitions for strict TypeScript compilation

---

## 3. Architecture & Performance Guardrails

### 3.1 Next.js App Router & SSR Isolation
- All 3D components are client-only (`'use client'`).
- Dynamically loaded via `next/dynamic(..., { ssr: false, loading: () => <Skeleton /> })` to eliminate server-side WebGL evaluation and hydration mismatches.
- Zero impact on First Contentful Paint (FCP) and Largest Contentful Paint (LCP).

### 3.2 WebGL Context & Battery Optimization
- **DPR Clamping**: Device pixel ratio clamped to `[1, 1.5]` to avoid high fill-rate GPU drain on high-density mobile screens.
- **Viewport Observer**: Canvases are wrapped with an `IntersectionObserver`. Render loops are paused (`frameloop="never"`) when the element scrolls out of the viewport.
- **Context Loss Recovery**: Gracefully handles `webglcontextlost` events without unmounting or crashing parent React components.
- **Reduced Motion**: Strictly respects `@media (prefers-reduced-motion: reduce)`. If enabled, renders static 2D vector radar telemetry with zero animation ticks.

---

## 4. Component Specifications

### 4.1 Hero 3D Radar Signal Sphere (`components/r3f/radar-signal-sphere.tsx`)
- **Location**: In the homepage hero section (`app/home-client.tsx`), adjacent to the value proposition and proof bar.
- **Visuals**:
  - Dark wireframe geosphere with subtle latitude/longitude rings in violet/slate (`#2e1065` / `rgba(124, 58, 237, 0.3)`).
  - Orbiting 3D signal pings color-coded by ingest source:
    - GitHub (Violet / Indigo `#818cf8`)
    - Hacker News (Amber `#f59e0b`)
    - App Store (Sky Cyan `#38bdf8`)
    - Discourse (Emerald `#10b981`)
  - Subtle rotating radar sweep disc on the equator plane.
  - Smooth damped pointer parallax (rotates smoothly toward mouse cursor on desktop; continuous slow ambient drift on touch devices).

### 4.2 Drop Detail 3D Solution Graph (`components/r3f/brief-solution-graph.tsx`)
- **Location**: Above or beside the architecture and DDL schema in `/feed/[slug]/page.tsx`.
- **Visuals**:
  - 3-4 outer complaint nodes displaying platform source badges.
  - Glowing curved bezier connections pulsing data particles toward a central crystallized micro-SaaS solution cube/nucleus.
  - Interactive hover/tap states revealing brief complaint quotes and telemetry scores.

### 4.3 Lightweight 3D Card Sheen (`components/card-3d-tilt.tsx`)
- **Location**: Wraps cards in the homepage masonry grid and feed browser.
- **Mechanism**: Pure CSS 3D transform (`perspective`, `rotateX`, `rotateY`) with dynamic radial-gradient glare tracking pointer coordinates.
- Avoids spawning dozens of WebGL contexts while delivering tactile 3D physical depth.

---

## 5. Verification Plan
1. **Automated Verification**:
   - `npm run typecheck` (`tsc --noEmit`) passing with 0 errors.
   - `npm run test` (Vitest suites) passing with 0 regressions.
   - `npm run build` (`next build`) compiling production bundles cleanly.
2. **Visual & Performance Verification**:
   - Inspect local dev server on desktop and simulated mobile viewport.
   - Confirm canvas freezes when scrolled out of view.
   - Confirm smooth 60fps interaction and clean aesthetic harmony with Space Grotesk / JetBrains Mono typography and violet dark-mode palette.
   - Verify zero modifications to `origin/main` until explicit user sign-off.
