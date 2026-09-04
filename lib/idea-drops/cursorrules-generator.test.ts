import { describe, expect, it } from "vitest";
import { generateCursorRules } from "./cursorrules-generator";
import type { IdeaDrop } from "@/types/idea-drop";

describe("generateCursorRules", () => {
  const sampleIdea: IdeaDrop = {
    id: "sourced-test-1",
    slug: "invoice-sync-tool",
    title: "Invoice Sync Tool for Bookkeepers",
    category: "Micro-SaaS",
    demandScore: 88,
    tags: ["finance", "invoicing"],
    publishedAt: "2026-08-30",
    tier: "builder",
    problem: {
      summary: "Solo bookkeepers lose hours reconciling dual currency receipts.",
      whoFeelsIt: "Independent bookkeepers and remote accountants",
    },
    evidence: [],
    whyNow: "Dual currency gig transactions grew 40% this year.",
    buildBrief: {
      coreLoop: ["Upload CSV", "Normalize currency", "Export clean ledger"],
      mvpScope: ["CSV parser", "Currency converter"],
      explicitlyCut: ["Full ERP sync"],
      dataModel: [
        { name: "Invoice", fields: "id, amount, date, is_reconciled" },
        { name: "Client", fields: "id, name, email, created_at" },
      ],
    },
    matchedApis: [
      {
        name: "Open Exchange Rates",
        purpose: "Currency conversion",
        freeTierLimit: "1,000 req/mo",
        sourceUrl: "https://openexchangerates.org",
      },
    ],
    launchStack: [
      {
        layer: "database",
        tool: "Supabase",
        freeTierNote: "Free 500MB Postgres",
      },
    ],
    agentPrompts: {
      claudeCode: "Build the invoice sync tool using Next.js and Supabase.",
      cursorWindsurf: "You are building the invoice sync tool MVP.",
      v0Bolt: "Scaffold a clean ledger UI with dual currency tables.",
    },
    difficulty: { soloWeekendProject: true, estimatedHours: 8, skillFloor: "intermediate" },
    status: "published",
  };

  it("generates cursorrules markdown with problem context, stack, and prohibitions", () => {
    const rules = generateCursorRules(sampleIdea);

    expect(rules).toContain("# .cursorrules — Invoice Sync Tool for Bookkeepers");
    expect(rules).toContain("https://www.getsourced.dev/feed/invoice-sync-tool");
    expect(rules).toContain("Problem: Solo bookkeepers lose hours reconciling dual currency receipts.");
    expect(rules).toContain("database: Supabase (Free 500MB Postgres)");
    expect(rules).toContain("1. Upload CSV");
    expect(rules).toContain("- [x] CSV parser");
    expect(rules).toContain("PROHIBITED IN MVP: Full ERP sync");
    expect(rules).toContain("Invoice: id, amount, date, is_reconciled");
    expect(rules).toContain("Open Exchange Rates: Currency conversion");
    expect(rules).toContain("You are building the invoice sync tool MVP.");
  });
});