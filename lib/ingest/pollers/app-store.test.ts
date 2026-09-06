import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { pollAppStoreReviews } from "./app-store";

describe("pollAppStoreReviews", () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    global.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it("filters out 3-5 star reviews and metadata entry, retaining only 1-2 star complaints", async () => {
    const mockFeed = {
      feed: {
        entry: [
          // Index 0: App metadata (should be skipped)
          { id: { label: "metadata" }, title: { label: "App Info" } },
          // Index 1: 5-star review (should be skipped)
          {
            id: { label: "rev-5" },
            title: { label: "Great app" },
            content: { label: "I love this app, works completely fine for my daily invoicing and tracking." },
            "im:rating": { label: "5" },
            author: { name: { label: "happy_user" } },
            updated: { label: "2026-09-06T00:00:00Z" },
          },
          // Index 2: 1-star review with long text (should be kept)
          {
            id: { label: "rev-1" },
            title: { label: "Login loop and broken sync" },
            content: {
              label:
                "Every single time I try to authenticate, the app resets to the main login screen. It has been broken for weeks and support refuses to acknowledge the sync bug on invoices.",
            },
            "im:rating": { label: "1" },
            author: { name: { label: "frustrated_bookkeeper" } },
            updated: { label: "2026-09-06T01:00:00Z" },
            link: { attributes: { href: "https://apps.apple.com/app/id584606479#review-rev-1" } },
          },
          // Index 3: 2-star review with short text (< 120 chars, should be noise filtered)
          {
            id: { label: "rev-2-short" },
            title: { label: "Too slow" },
            content: { label: "App crashes constantly." },
            "im:rating": { label: "2" },
            author: { name: { label: "user2" } },
            updated: { label: "2026-09-06T02:00:00Z" },
          },
        ],
      },
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockFeed,
    } as Response);

    const testTarget = [{ id: "584606479", name: "QuickBooks" }];
    const result = await pollAppStoreReviews(testTarget);

    expect(result.signals).toHaveLength(1);
    expect(result.noiseFiltered).toBe(1); // the short 2-star review was noise filtered
    expect(result.signals[0]).toMatchObject({
      source: "appstore",
      url: "https://apps.apple.com/app/id584606479#review-rev-1",
      title: "QuickBooks: Login loop and broken sync",
      author: "frustrated_bookkeeper",
      engagementMetric: 4, // 5 - 1 = 4
      postedAt: "2026-09-06T01:00:00Z",
    });
  });

  it("handles fetch errors gracefully without throwing", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
    } as Response);

    const testTarget = [{ id: "584606479", name: "QuickBooks" }];
    const result = await pollAppStoreReviews(testTarget);

    expect(result.signals).toEqual([]);
    expect(result.noiseFiltered).toBe(0);
  });
});
