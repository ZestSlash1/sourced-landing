import { afterEach, describe, expect, it, vi } from "vitest";
import { pollDevRant } from "./devrant";

describe("pollDevRant", () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it("handles fetch failure gracefully", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
    } as Response);

    const result = await pollDevRant();
    expect(result).toEqual({ signals: [], noiseFiltered: 0 });
  });

  it("filters low scores and applies noise filtering on short rants", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        rants: [
          {
            id: 101,
            text: "Too short", // < 120 chars -> noise filtered
            score: 5,
            created_time: 1725400000,
            num_comments: 2,
            user_username: "dev1",
          },
          {
            id: 102,
            text: "This is a sufficiently long rant that describes a real technical problem with legacy architecture and broken documentation that frustrates many developers every single day.",
            score: -1, // score < 0 -> skipped before noise filter
            created_time: 1725400000,
            num_comments: 0,
            user_username: "dev2",
          },
          {
            id: 103,
            text: "This is another sufficiently long rant explaining in great detail how continuous integration pipelines constantly fail due to flaky tests and how difficult it is to debug them without local reproduction tools.",
            score: 10,
            created_time: 1725400000,
            num_comments: 4,
            user_username: "dev3",
          },
        ],
      }),
    } as Response);

    const result = await pollDevRant();
    expect(result.signals).toHaveLength(1);
    expect(result.noiseFiltered).toBe(1);
    expect(result.signals[0]).toEqual({
      source: "devrant",
      url: "https://devrant.com/rants/103",
      title: null,
      text: "This is another sufficiently long rant explaining in great detail how continuous integration pipelines constantly fail due to flaky tests and how difficult it is to debug them without local reproduction tools.",
      author: "dev3",
      engagementMetric: 14,
      postedAt: new Date(1725400000 * 1000).toISOString(),
    });
  });
});
