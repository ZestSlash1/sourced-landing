import { describe, expect, it } from "vitest";
import { computeEconomicAssessment } from "./economic-severity";

describe("computeEconomicAssessment", () => {
  it("computes severe economic score for high-demand financial tools", () => {
    const assessment = computeEconomicAssessment({
      category: "Micro-SaaS",
      title: "GST invoice reconciliation for freelancers",
      demandScore: 92,
      problem: {
        summary: "Freelancers reconcile GST invoices by hand every quarter.",
        whoFeelsIt: "Indian solo freelancers",
      },
    });

    expect(assessment.score).toBeGreaterThanOrEqual(85);
    expect(assessment.level).toBe("Critical");
    expect(assessment.suggestedPricing.starter).toBe("$19/mo");
    expect(assessment.buyerPersona).toBe("Indian solo freelancers");
    expect(assessment.estimatedMonthlyRoi).toContain("hours");
  });

  it("handles API tools with appropriate pricing and value metrics", () => {
    const assessment = computeEconomicAssessment({
      category: "API Tool",
      title: "CRM duplicate contact merger",
      demandScore: 78,
      problem: {
        summary: "Merge duplicate contacts across 3 CRMs in one API call.",
        whoFeelsIt: "B2B Sales Operations",
      },
    });

    expect(assessment.score).toBeGreaterThanOrEqual(75);
    expect(assessment.suggestedPricing.starter).toBe("$29/mo");
    expect(assessment.suggestedPricing.valueMetric).toBe("per 10,000 requests");
    expect(assessment.workaroundExpense).toContain("engineering overhead");
  });

  it("provides sensible defaults for Chrome Extensions", () => {
    const assessment = computeEconomicAssessment({
      category: "Chrome Extension",
      title: "Figma duplicate line item checker",
      demandScore: 70,
      problem: {
        summary: "Flag duplicate items in shared Figma browser tabs.",
        whoFeelsIt: "Product designers",
      },
    });

    expect(assessment.level).toBe("Moderate");
    expect(assessment.suggestedPricing.starter).toBe("$9/mo");
    expect(assessment.suggestedPricing.pro).toBe("$24/mo");
  });
});
