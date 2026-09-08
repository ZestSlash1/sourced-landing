import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

describe("Hero Pipeline Integration", () => {
  const homeClientContent = fs.readFileSync(path.resolve("app/home-client.tsx"), "utf-8");
  const globalsCss = fs.readFileSync(path.resolve("app/globals.css"), "utf-8");

  it("imports and mounts PipelineField in hero", () => {
    expect(homeClientContent).toContain("PipelineField");
    expect(homeClientContent).toContain("pipeline-labels");
    expect(homeClientContent).toContain("source-tally");
  });

  it("retains terminal command and agent tabs exactly", () => {
    expect(homeClientContent).toContain("claude code brief.md");
    expect(homeClientContent).toContain("Claude Code");
    expect(homeClientContent).toContain("Cursor");
    expect(homeClientContent).toContain("Windsurf");
    expect(homeClientContent).toContain("v0");
    expect(homeClientContent).toContain("Bolt");
  });

  it("includes pipeline styles in globals.css", () => {
    expect(globalsCss).toContain(".hero-veil");
    expect(globalsCss).toContain(".pipeline-labels");
    expect(globalsCss).toContain(".source-tally");
    expect(globalsCss).toContain("@keyframes stagepulse");
  });
});
