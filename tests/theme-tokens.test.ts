import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

describe("Theme Tokens & RGB Animations", () => {
  const css = fs.readFileSync(path.resolve(process.cwd(), "app/globals.css"), "utf-8");

  it("defines obsidian canvas and surface colors", () => {
    expect(css).toContain("--bg: #08090E");
    expect(css).toContain("--surface: #10121A");
    expect(css).toContain("--surface-elevated: #161824");
  });

  it("defines vibrant chromatic RGB gradients", () => {
    expect(css).toContain("--rgb-rainbow:");
    expect(css).toContain("--rgb-conic-rainbow:");
    expect(css).toContain("--rgb-beam-violet-cyan:");
    expect(css).toContain("--rgb-card-glow:");
  });

  it("defines keyframe animations for Magic UI primitives", () => {
    expect(css).toContain("@keyframes border-beam");
    expect(css).toContain("@keyframes shine-rotate");
    expect(css).toContain("@keyframes rainbow-cycle");
    expect(css).toContain("@keyframes marquee");
    expect(css).toContain("@keyframes meteor");
  });
});
