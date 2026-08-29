import { afterEach, describe, expect, it, vi } from "vitest";
import { toEvidence } from "./to-evidence";
import type { RawComplaint } from "./types";

function mockAnthropicText(text: string) {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ content: [{ type: "text", text }] }),
    })
  );
}

describe("toEvidence", () => {
  const raw: RawComplaint = {
    platform: "reddit",
    subforum: "r/SaaS",
    rawText: "I keep manually reformatting exports every month, it's brutal",
    url: "https://reddit.com/r/SaaS/1",
    date: "2026-08-01T00:00:00.000Z",
    engagementRaw: { type: "upvotes", value: 42 },
  };

  afterEach(() => {
    vi.unstubAllGlobals();
    process.env.ANTHROPIC_API_KEY = "test-key";
  });

  it("returns a clean Evidence item when the complaint qualifies", async () => {
    process.env.ANTHROPIC_API_KEY = "test-key";
    mockAnthropicText(
      JSON.stringify({
        qualifies: true,
        quote: "Manually reformatting monthly exports is brutal",
        summary: "Manual export reformatting",
      })
    );

    const result = await toEvidence(raw);

    expect(result).toEqual({
      platform: "reddit",
      subforum: "r/SaaS",
      quote: "Manually reformatting monthly exports is brutal",
      url: "https://reddit.com/r/SaaS/1",
      date: "2026-08-01T00:00:00.000Z",
      engagementMetric: { type: "upvotes", value: 42 },
    });
  });

  it("returns null when the complaint doesn't qualify", async () => {
    process.env.ANTHROPIC_API_KEY = "test-key";
    mockAnthropicText(JSON.stringify({ qualifies: false }));

    const result = await toEvidence(raw);

    expect(result).toBeNull();
  });
});
