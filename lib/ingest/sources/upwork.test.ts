import { describe, expect, it } from "vitest";
import { fetchUpworkJobs, parseUpworkPastedJobs } from "./upwork";

describe("upwork connector", () => {
  it("throws a clear error when API credentials are missing", async () => {
    await expect(fetchUpworkJobs("bookkeeping")).rejects.toThrow(/credentials/);
  });

  it("parses manually pasted jobs into RawComplaint entries", () => {
    const result = parseUpworkPastedJobs([
      {
        title: "Need CRM dedupe script",
        description: "Merging duplicate contacts across 3 CRMs is a nightmare",
        url: "https://www.upwork.com/jobs/1",
        postedAt: "2026-08-01T00:00:00.000Z",
        budgetUsd: 500,
      },
    ]);

    expect(result).toEqual([
      {
        platform: "upwork",
        rawText: "Need CRM dedupe script\n\nMerging duplicate contacts across 3 CRMs is a nightmare",
        url: "https://www.upwork.com/jobs/1",
        date: "2026-08-01T00:00:00.000Z",
        engagementRaw: { type: "budget_usd", value: 500 },
      },
    ]);
  });
});
