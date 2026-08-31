import { describe, expect, it } from "vitest";
import { ideaDropToRow, rowToIdeaDrop } from "./mapping";
import type { IdeaDrop } from "@/types/idea-drop";
import type { IdeaDropRow } from "./mapping";

const idea: IdeaDrop = {
  id: "sourced-2026-08-29-001",
  slug: "gst-invoice-reconciliation",
  title: "One-click GST invoice reconciliation for freelancers",
  category: "Micro-SaaS",
  demandScore: 88,
  tags: ["invoicing", "india", "freelance"],
  publishedAt: "2026-08-29",
  tier: "builder",
  problem: {
    summary: "Freelancers reconcile GST invoices by hand every quarter.",
    whoFeelsIt: "Indian solo freelancers filing their own GST returns",
  },
  evidence: [
    {
      platform: "reddit",
      subforum: "r/SaaS",
      quote: "I waste hours reconciling invoices every month",
      url: "https://reddit.com/r/SaaS/comments/abc",
      date: "2026-08-01",
    },
  ],
  whyNow: "GST e-invoicing thresholds dropped again this year.",
  buildBrief: {
    coreLoop: ["Upload invoices", "Auto-match to returns", "Export summary"],
    mvpScope: ["CSV upload", "Matching engine"],
    explicitlyCut: ["Multi-user teams"],
    dataModel: [{ name: "Invoice", fields: "id, amount, gstin, date" }],
  },
  matchedApis: [
    {
      name: "Open Exchange Rates",
      purpose: "Convert foreign-currency invoices to INR",
      freeTierLimit: "1000 req/month",
      sourceUrl: "https://openexchangerates.org/",
    },
  ],
  launchStack: [
    {
      layer: "hosting",
      tool: "Vercel",
      freeTierNote: "Hobby tier",
      sourceUrl: "https://vercel.com",
    },
  ],
  agentPrompts: {
    claudeCode: "Build a GST reconciliation tool...",
    cursorWindsurf: "Build a GST reconciliation tool...",
    v0Bolt: "Build a GST reconciliation tool...",
  },
  difficulty: {
    soloWeekendProject: true,
    estimatedHours: 18,
    skillFloor: "intermediate",
  },
  status: "published",
  featured: false,
  updatedAt: "2026-08-29T00:00:00.000Z",
};

const row: IdeaDropRow = {
  id: idea.id,
  slug: idea.slug,
  title: idea.title,
  category: idea.category,
  demand_score: idea.demandScore,
  tags: idea.tags,
  published_at: idea.publishedAt,
  tier: idea.tier,
  problem: idea.problem,
  evidence: idea.evidence,
  why_now: idea.whyNow,
  build_brief: idea.buildBrief,
  matched_apis: idea.matchedApis,
  launch_stack: idea.launchStack,
  agent_prompts: idea.agentPrompts,
  difficulty: idea.difficulty,
  status: idea.status,
  validation_errors: null,
  featured: false,
  source_signal_ids: null,
  platform_count: null,
  cross_platform: null,
  competitive_landscape: null,
  created_at: "2026-08-29T00:00:00.000Z",
  updated_at: idea.updatedAt as string,
};

describe("rowToIdeaDrop", () => {
  it("maps a snake_case DB row to the camelCase IdeaDrop shape", () => {
    expect(rowToIdeaDrop(row)).toEqual(idea);
  });

  it("maps a null validation_errors column to an absent field, not null", () => {
    const mapped = rowToIdeaDrop(row);
    expect(Object.keys(mapped)).not.toContain("validationErrors");
  });

  it("carries validation_errors through when present", () => {
    const mapped = rowToIdeaDrop({ ...row, validation_errors: ["bad evidence"] });
    expect(mapped.validationErrors).toEqual(["bad evidence"]);
  });

  it("drops created_at but carries updated_at through as updatedAt", () => {
    const mapped = rowToIdeaDrop(row);
    expect(Object.keys(mapped)).not.toContain("createdAt");
    expect(mapped.updatedAt).toBe(row.updated_at);
  });
});

describe("ideaDropToRow", () => {
  it("maps an IdeaDrop back to the snake_case insert/update shape", () => {
    expect(ideaDropToRow(idea)).toEqual({
      id: idea.id,
      slug: idea.slug,
      title: idea.title,
      category: idea.category,
      demand_score: idea.demandScore,
      tags: idea.tags,
      published_at: idea.publishedAt,
      tier: idea.tier,
      problem: idea.problem,
      evidence: idea.evidence,
      why_now: idea.whyNow,
      build_brief: idea.buildBrief,
      matched_apis: idea.matchedApis,
      launch_stack: idea.launchStack,
      agent_prompts: idea.agentPrompts,
      difficulty: idea.difficulty,
      status: idea.status,
      validation_errors: null,
      featured: false,
      source_signal_ids: null,
      platform_count: null,
      cross_platform: null,
      competitive_landscape: null,
    });
  });

  it("maps a populated validationErrors array through", () => {
    const withErrors = { ...idea, validationErrors: ["only 2 evidence items"] };
    expect(ideaDropToRow(withErrors).validation_errors).toEqual(["only 2 evidence items"]);
  });

  it("round-trips through row and back to an identical IdeaDrop, minus the DB-managed updatedAt", () => {
    // ideaDropToRow omits updated_at (the DB trigger sets it on write), so a
    // round trip through it can't reproduce the original updatedAt.
    expect(rowToIdeaDrop(ideaDropToRow(idea) as IdeaDropRow)).toEqual({ ...idea, updatedAt: undefined });
  });
});
