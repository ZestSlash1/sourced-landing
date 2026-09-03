import { describe, expect, it } from "vitest";
import { generateProductionContract } from "./production-contract";
import type { IdeaDrop } from "@/types/idea-drop";

describe("generateProductionContract", () => {
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
    launchStack: [],
    agentPrompts: { claudeCode: "", cursorWindsurf: "", v0Bolt: "" },
    difficulty: { soloWeekendProject: true, estimatedHours: 8, skillFloor: "intermediate" },
    status: "published",
  };

  it("generates markdown contract with SQL DDL and RLS policies", () => {
    const contract = generateProductionContract(sampleIdea);

    expect(contract).toContain("# Production Architecture Specification: Invoice Sync Tool for Bookkeepers");
    expect(contract).toContain("create table if not exists public.invoices");
    expect(contract).toContain("alter table public.invoices enable row level security;");
    expect(contract).toContain("create table if not exists public.clients");
    expect(contract).toContain("Open Exchange Rates");
    expect(contract).toContain("DO NOT BUILD: Full ERP sync");
    expect(contract).toContain("npm test");
  });
});
