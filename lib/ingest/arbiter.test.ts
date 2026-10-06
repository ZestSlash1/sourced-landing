import { describe, expect, it, vi, afterEach, beforeEach } from "vitest";
import { arbitrateGroup } from "./arbiter";
import type { RawSignal } from "./types";

function makeSignal(id: string, source: RawSignal["source"], text: string): RawSignal {
  return {
    id,
    source,
    url: `https://example.com/${id}`,
    title: null,
    text,
    author: null,
    engagementMetric: 0,
    postedAt: null,
    clusterKey: null,
    draftedIdeaId: null,
    fetchedAt: new Date().toISOString(),
    embedding: null,
    classifiedAsComplaint: true,
    problemStatement: text,
    domain: null,
    classificationConfidence: 0.9,
  };
}

describe("arbitrateGroup", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv, OLLAMA_URL: "http://localhost:11434" };
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.restoreAllMocks();
  });

  it("splits high/medium confidence groups from low-confidence borderline groups, dropping singletons", async () => {
    const signals = [makeSignal("a", "hackernews", "can't do X"), makeSignal("b", "github", "unable to do X too")];
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        response: JSON.stringify({
          groups: [
            { signal_ids: ["a", "b"], shared_problem_summary: "same complaint", confidence: "high" },
            { signal_ids: ["a"], shared_problem_summary: "lone signal", confidence: "medium" },
          ],
        }),
      }),
    });

    const result = await arbitrateGroup(["a", "b"], signals);

    expect(result.confirmedGroups).toHaveLength(1);
    expect(result.confirmedGroups[0].signalIds).toEqual(["a", "b"]);
    expect(result.borderlineGroups).toHaveLength(0);
  });

  it("treats a low-confidence 2+ signal group as borderline, not confirmed", async () => {
    const signals = [makeSignal("a", "hackernews", "x"), makeSignal("b", "github", "y")];
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        response: JSON.stringify({
          groups: [{ signal_ids: ["a", "b"], shared_problem_summary: "maybe related", confidence: "low" }],
        }),
      }),
    });

    const result = await arbitrateGroup(["a", "b"], signals);
    expect(result.confirmedGroups).toHaveLength(0);
    expect(result.borderlineGroups).toHaveLength(1);
  });

  it("retries once and then reports an error instead of throwing when Ollama fails twice", async () => {
    const signals = [makeSignal("a", "hackernews", "x"), makeSignal("b", "github", "y")];
    global.fetch = vi.fn().mockResolvedValue({ ok: false, status: 500, text: async () => "boom" });

    const result = await arbitrateGroup(["a", "b"], signals);
    expect(result.confirmedGroups).toHaveLength(0);
    expect(result.borderlineGroups).toHaveLength(0);
    expect(result.error).toBeTruthy();
    expect(global.fetch).toHaveBeenCalledTimes(2);
  });

  it("recovers on the second attempt after a first parse failure", async () => {
    const signals = [makeSignal("a", "hackernews", "x"), makeSignal("b", "github", "y")];
    global.fetch = vi
      .fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ response: "not json at all" }) })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          response: JSON.stringify({
            groups: [{ signal_ids: ["a", "b"], shared_problem_summary: "same", confidence: "high" }],
          }),
        }),
      });

    const result = await arbitrateGroup(["a", "b"], signals);
    expect(result.error).toBeUndefined();
    expect(result.confirmedGroups).toHaveLength(1);
  });
});
