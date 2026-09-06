import { describe, it, expect, vi } from "vitest";
import { renderDropEmail, deduplicateRecipients, dispatchWeeklyDrop } from "./dispatcher";
import type { IdeaDrop } from "@/types/idea-drop";

vi.mock("server-only", () => ({}));

const mockIdea: IdeaDrop = {
  id: "test-idea-1",
  slug: "client-ready-pl-exports",
  title: "Client-ready P&L exports for solo bookkeepers",
  category: "Micro-SaaS",
  demandScore: 88,
  tags: ["finance", "bookkeeping"],
  publishedAt: "2026-09-01T00:00:00Z",
  tier: "free",
  problem: {
    summary: "Solo bookkeepers waste 3 hours every month reformatting raw CSV statements into clean client PDFs.",
    whoFeelsIt: "Freelance accountants and bookkeepers",
  },
  evidence: [],
  whyNow: "Tax deadlines and shifting banking export standards.",
  buildBrief: {
    coreLoop: ["Upload CSV", "Map accounts", "Export branded PDF"],
    mvpScope: ["CSV upload", "PDF export"],
    explicitlyCut: ["Bank integrations"],
    dataModel: [],
  },
  matchedApis: [
    {
      name: "PDFShift",
      purpose: "Document export",
      freeTierLimit: "250 conversions/mo", sourceUrl: "https://pdfshift.io",
      },
  ],
  launchStack: [],
  agentPrompts: {
    claudeCode: "Build a Next.js app...",
    cursorWindsurf: "Build a Next.js app...",
    v0Bolt: "Build a Next.js app...",
  },
  difficulty: {
    soloWeekendProject: true,
    estimatedHours: 12,
    skillFloor: "intermediate",
  },
  status: "published",
};

describe("renderDropEmail", () => {
  it("renders a valid subject line with title and demand score", () => {
    const { subject } = renderDropEmail(mockIdea);
    expect(subject).toContain("Client-ready P&L exports for solo bookkeepers");
    expect(subject).toContain("88% Demand Signal");
  });

  it("renders HTML containing key drop elements and brief link", () => {
    const { html } = renderDropEmail(mockIdea);
    expect(html).toContain("Client-ready P&L exports for solo bookkeepers");
    expect(html).toContain("Micro-SaaS");
    expect(html).toContain("Solo bookkeepers waste 3 hours every month");
    expect(html).toContain("https://www.getsourced.dev/feed/client-ready-pl-exports");
    expect(html).toContain("PDFShift");
  });

  it("renders plain text fallback version", () => {
    const { text } = renderDropEmail(mockIdea);
    expect(text).toContain("Client-ready P&L exports for solo bookkeepers");
    expect(text).toContain("https://www.getsourced.dev/feed/client-ready-pl-exports");
    expect(text).toContain("Solo bookkeepers waste 3 hours");
  });
});

describe("deduplicateRecipients", () => {
  it("normalizes, trims, lowercases, and removes duplicate emails", () => {
    const listA = ["User@Example.com", "  dev@test.io  ", "admin@domain.com"];
    const listB = ["user@example.com", "hello@world.com", "invalid-email", ""];
    const result = deduplicateRecipients(listA, listB);

    expect(result).toEqual([
      "user@example.com",
      "dev@test.io",
      "admin@domain.com",
      "hello@world.com",
    ]);
  });
});

describe("dispatchWeeklyDrop in dry-run mode", () => {
  it("returns recipient count and preview without making network calls", async () => {
    const result = await dispatchWeeklyDrop(mockIdea, {
      dryRun: true,
      testRecipients: ["test1@example.com", "test2@example.com"],
    });

    expect(result.dryRun).toBe(true);
    expect(result.success).toBe(true);
    expect(result.recipientCount).toBe(2);
    expect(result.subject).toContain("Client-ready P&L exports");
  });
});