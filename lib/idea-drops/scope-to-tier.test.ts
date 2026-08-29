import { describe, expect, it } from "vitest";
import { scopeToTier } from "./scope-to-tier";
import type { IdeaDrop } from "@/types/idea-drop";

function fullIdea(overrides: Partial<IdeaDrop> = {}): IdeaDrop {
  return {
    id: "sourced-2026-08-29-001",
    slug: "example-idea",
    title: "Example idea",
    category: "Micro-SaaS",
    demandScore: 80,
    tags: ["finance"],
    publishedAt: new Date().toISOString(),
    tier: "builder",
    problem: { summary: "A problem", whoFeelsIt: "Someone" },
    evidence: [
      { platform: "reddit", quote: "a", url: "https://x/1", date: new Date().toISOString() },
      { platform: "g2", quote: "b", url: "https://x/2", date: new Date().toISOString() },
      { platform: "upwork", quote: "c", url: "https://x/3", date: new Date().toISOString() },
    ],
    whyNow: "Because now",
    buildBrief: {
      coreLoop: ["step1"],
      mvpScope: ["scope1"],
      explicitlyCut: ["cut1"],
      dataModel: [{ name: "User", fields: "id, email" }],
    },
    matchedApis: [
      { name: "SomeAPI", purpose: "does a thing", freeTierLimit: "100/day", sourceUrl: "https://x" },
    ],
    launchStack: [{ layer: "hosting", tool: "Vercel", freeTierNote: "free" }],
    agentPrompts: { claudeCode: "prompt", cursorWindsurf: "prompt", v0Bolt: "prompt" },
    difficulty: { soloWeekendProject: true, estimatedHours: 10, skillFloor: "intermediate" },
    status: "published",
    ...overrides,
  };
}

describe("scopeToTier", () => {
  it("returns the full idea when the user tier meets the required tier", () => {
    const idea = fullIdea({ tier: "builder" });
    const result = scopeToTier(idea, "builder");
    expect(result).toBe(idea);
  });

  it("returns the full idea for a higher user tier", () => {
    const idea = fullIdea({ tier: "builder" });
    const result = scopeToTier(idea, "studio");
    expect(result).toBe(idea);
  });

  it("returns a teaser with gated keys genuinely absent for an under-tier user", () => {
    const idea = fullIdea({ tier: "builder" });
    const result = scopeToTier(idea, "free");

    expect("locked" in result && result.locked).toBe(true);
    const keys = Object.keys(result);
    for (const gatedKey of [
      "buildBrief",
      "matchedApis",
      "launchStack",
      "agentPrompts",
      "difficulty",
      "whyNow",
      "validationErrors",
    ]) {
      expect(keys).not.toContain(gatedKey);
    }
    expect((result as { evidence: unknown[] }).evidence).toHaveLength(1);
  });
});
