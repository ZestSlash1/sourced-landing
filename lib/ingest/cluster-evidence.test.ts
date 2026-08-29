import { afterEach, describe, expect, it, vi } from "vitest";
import { clusterEvidence } from "./cluster-evidence";
import type { Evidence } from "@/types/idea-drop";

function evidence(quote: string): Evidence {
  return { platform: "reddit", quote, url: "https://x", date: new Date().toISOString() };
}

describe("clusterEvidence", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("returns only clusters with 2+ items", async () => {
    process.env.ANTHROPIC_API_KEY = "test-key";
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          content: [{ type: "text", text: JSON.stringify({ clusters: [[0, 2], [1]] }) }],
        }),
      })
    );

    const items = [evidence("a"), evidence("b"), evidence("c")];
    const result = await clusterEvidence(items);

    expect(result).toEqual([[items[0], items[2]]]);
  });

  it("returns an empty array for no evidence without calling the LLM", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const result = await clusterEvidence([]);

    expect(result).toEqual([]);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
