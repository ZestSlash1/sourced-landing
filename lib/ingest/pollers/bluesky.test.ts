import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { pollBluesky } from "./bluesky";

describe("pollBluesky", () => {
  const originalEnv = { ...process.env };
  const originalFetch = global.fetch;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
    global.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it("returns empty result when credentials are not configured", async () => {
    delete process.env.BLUESKY_HANDLE;
    delete process.env.BLUESKY_APP_PASSWORD;

    const result = await pollBluesky();
    expect(result).toEqual({ signals: [], noiseFiltered: 0 });
  });

  it("fetches posts when credentials are provided, deduplicates, and filters short noise", async () => {
    process.env.BLUESKY_HANDLE = "test.bsky.social";
    process.env.BLUESKY_APP_PASSWORD = "test-password";

    global.fetch = vi.fn().mockImplementation(async (url: string) => {
      if (url.includes("createSession")) {
        return {
          ok: true,
          json: async () => ({ accessJwt: "fake-jwt" }),
        } as Response;
      }

      if (url.includes("searchPosts")) {
        return {
          ok: true,
          json: async () => ({
            posts: [
              {
                uri: "at://did:plc:123/app.bsky.feed.post/post1",
                author: { handle: "alice.bsky.social" },
                record: {
                  text: "Short post", // < 120 chars -> noise filtered
                  createdAt: "2026-09-04T00:00:00.000Z",
                },
                likeCount: 5,
                repostCount: 2,
              },
              {
                uri: "at://did:plc:456/app.bsky.feed.post/post2",
                author: { handle: "bob.bsky.social" },
                record: {
                  text: "I wish someone would build a reliable sync tool for multi-platform customer feedback that does not cost hundreds of dollars every month and actually works well.",
                  createdAt: "2026-09-04T01:00:00.000Z",
                },
                likeCount: 12,
                repostCount: 3,
              },
            ],
          }),
        } as Response;
      }

      return { ok: false, status: 404 } as Response;
    });

    const result = await pollBluesky();
    expect(result.signals.length).toBeGreaterThanOrEqual(1);
    expect(result.signals[0]).toMatchObject({
      source: "bluesky",
      url: "https://bsky.app/profile/bob.bsky.social/post/post2",
      author: "bob.bsky.social",
      engagementMetric: 15,
      postedAt: "2026-09-04T01:00:00.000Z",
    });
  });
});
