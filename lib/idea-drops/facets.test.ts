import { describe, expect, it } from "vitest";
import type { IdeaDrop } from "@/types/idea-drop";
import { apiFacets, categoryFacets, labelForSlug, platformFacets, PLATFORM_LABELS, stackFacets } from "./facets";

function makeIdea(overrides: Partial<IdeaDrop> = {}): IdeaDrop {
  return {
    id: "idea-1",
    slug: "idea-1",
    title: "Idea 1",
    category: "Micro-SaaS",
    demandScore: 85,
    tags: [],
    publishedAt: "2026-09-01",
    tier: "free",
    problem: { summary: "problem", whoFeelsIt: "users" },
    evidence: [
      { platform: "hackernews", quote: "q1", url: "https://hn", date: "2026-09-01" },
      { platform: "bluesky", quote: "q2", url: "https://bsky", date: "2026-09-01" },
    ],
    whyNow: "why",
    buildBrief: { coreLoop: [], mvpScope: [], explicitlyCut: [], dataModel: [] },
    matchedApis: [
      { name: "Stripe", sourceUrl: "https://stripe.com", purpose: "billing", freeTierLimit: "test" },
    ],
    launchStack: [
      { layer: "payments", tool: "Next.js", freeTierNote: "free" },
    ],
    agentPrompts: { claudeCode: "prompt", cursorWindsurf: "prompt", v0Bolt: "prompt" },
    difficulty: { soloWeekendProject: true, estimatedHours: 8, skillFloor: "beginner" },
    status: "published",
    ...overrides,
  };
}

describe("facets", () => {
  it("extracts and counts category facets", () => {
    const ideas = [
      makeIdea({ category: "Dev Tools" }),
      makeIdea({ category: "Dev Tools" }),
      makeIdea({ category: "Micro-SaaS" }),
    ];
    const facets = categoryFacets(ideas);
    expect(facets).toEqual([
      { slug: "dev-tools", label: "Dev Tools", count: 2 },
      { slug: "micro-saas", label: "Micro-SaaS", count: 1 },
    ]);
  });

  it("extracts and counts platform facets with known label overrides", () => {
    const ideas = [
      makeIdea({
        evidence: [
          { platform: "hackernews", quote: "q1", url: "https://hn", date: "2026-09-01" },
          { platform: "bluesky", quote: "q2", url: "https://bsky", date: "2026-09-01" },
        ],
      }),
      makeIdea({
        evidence: [
          { platform: "devrant", quote: "q3", url: "https://devrant", date: "2026-09-01" },
          { platform: "bluesky", quote: "q4", url: "https://bsky2", date: "2026-09-01" },
        ],
      }),
    ];
    const facets = platformFacets(ideas);
    expect(facets).toContainEqual({ slug: "bluesky", label: "Bluesky", count: 2 });
    expect(facets).toContainEqual({ slug: "hackernews", label: "Hacker News", count: 1 });
    expect(facets).toContainEqual({ slug: "devrant", label: "devRant", count: 1 });
  });

  it("extracts and counts stack facets and api facets", () => {
    const ideas = [
      makeIdea({
        launchStack: [
          { layer: "database", tool: "Supabase", freeTierNote: "free" },
        ],
        matchedApis: [
          { name: "OpenAI", sourceUrl: "https://openai.com", purpose: "llm", freeTierLimit: "paid" },
        ],
      }),
    ];
    const stacks = stackFacets(ideas);
    expect(stacks).toEqual([{ slug: "supabase", label: "Supabase", count: 1 }]);

    const apis = apiFacets(ideas);
    expect(apis).toEqual([{ slug: "openai", label: "OpenAI", count: 1 }]);
  });

  it("resolves labelForSlug correctly", () => {
    const facets = [
      { slug: "dev-tools", label: "Dev Tools", count: 2 },
      { slug: "micro-saas", label: "Micro-SaaS", count: 1 },
    ];
    expect(labelForSlug(facets, "dev-tools")).toBe("Dev Tools");
    expect(labelForSlug(facets, "micro-saas")).toBe("Micro-SaaS");
    expect(labelForSlug(facets, "unknown")).toBeNull();
  });

  it("includes all expected platforms in PLATFORM_LABELS", () => {
    expect(PLATFORM_LABELS.bluesky).toBe("Bluesky");
    expect(PLATFORM_LABELS.devrant).toBe("devRant");
    expect(PLATFORM_LABELS.hackernews).toBe("Hacker News");
    expect(PLATFORM_LABELS.discourse).toBe("Discourse");
  });
});
