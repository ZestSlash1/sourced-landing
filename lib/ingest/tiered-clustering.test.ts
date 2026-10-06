import { afterEach, describe, expect, it, vi } from "vitest";
import type { RawSignal } from "./types";

function makeSignal(id: string, source: RawSignal["source"], embedding: number[] | null): RawSignal {
  return {
    id,
    source,
    url: `https://example.com/${id}`,
    title: null,
    text: `text ${id}`,
    author: null,
    engagementMetric: 0,
    postedAt: null,
    clusterKey: null,
    draftedIdeaId: null,
    fetchedAt: new Date().toISOString(),
    embedding,
    classifiedAsComplaint: true,
    problemStatement: `text ${id}`,
    domain: null,
    classificationConfidence: 0.9,
  };
}

describe("computeTieredPairs", () => {
  afterEach(() => vi.resetModules());

  it("buckets pairs into auto-confirm, candidate, and discard bands", async () => {
    const { computeTieredPairs } = await import("./tiered-clustering");
    // identical vectors -> cosine 1.0 (auto-confirm)
    const a = makeSignal("a", "hackernews", [1, 0]);
    const b = makeSignal("b", "github", [1, 0]);
    // orthogonal to a/b -> cosine 0 (discard)
    const c = makeSignal("c", "devto", [0, 1]);
    // 0.8 cosine with a/b (candidate band), 0.6 cosine with c (also candidate band)
    const d = makeSignal("d", "lobsters", [0.8, 0.6]);

    const { autoPairs, candidatePairs } = computeTieredPairs([a, b, c, d]);

    expect(autoPairs).toEqual([[0, 1]]);
    expect(candidatePairs.map((p) => [p.signalAId, p.signalBId]).sort()).toEqual(
      [
        ["a", "d"],
        ["b", "d"],
        ["c", "d"],
      ].sort(),
    );
  });

  it("skips pairs where either signal is missing an embedding", async () => {
    const { computeTieredPairs } = await import("./tiered-clustering");
    const a = makeSignal("a", "hackernews", null);
    const b = makeSignal("b", "github", [1, 0]);
    const { autoPairs, candidatePairs } = computeTieredPairs([a, b]);
    expect(autoPairs).toEqual([]);
    expect(candidatePairs).toEqual([]);
  });
});

describe("runTieredClustering", () => {
  afterEach(() => {
    vi.doUnmock("./arbiter");
    vi.resetModules();
  });

  it("merges auto-confirmed and LLM-confirmed groups, dropping confirmed signals from leftover singletons", async () => {
    vi.doMock("./arbiter", () => ({
      arbitrateGroup: vi.fn().mockResolvedValue({
        confirmedGroups: [
          { signalIds: ["c", "d", "e"], sharedProblemSummary: "same complaint", confidence: "high" },
        ],
        borderlineGroups: [],
      }),
    }));
    const { runTieredClustering } = await import("./tiered-clustering");

    // a/b auto-confirm (identical vectors, orthogonal to the c/d/e subspace
    // so they never enter the candidate band). c/d/e sit ~0.7 cosine apart
    // from each other (candidate band, not auto-confirm) and get folded into
    // one LLM-confirmed group via c-d and c-e candidate edges.
    const a = makeSignal("a", "hackernews", [1, 0, 0, 0]);
    const b = makeSignal("b", "github", [1, 0, 0, 0]);
    const c = makeSignal("c", "devto", [0, 1, 0, 0]);
    const d = makeSignal("d", "lobsters", [0, 0.7, 0.7141, 0]);
    const e = makeSignal("e", "hackernews", [0, 0.7, -0.7141, 0]);

    const result = await runTieredClustering([a, b, c, d, e]);

    const clusterKeys = result.clusters.map((cl) => cl.signals.map((s) => s.id).sort());
    expect(clusterKeys).toContainEqual(["a", "b"]);
    expect(clusterKeys).toContainEqual(["c", "d", "e"]);
    // c/d/e must not also appear as leftover singletons
    expect(clusterKeys.filter((k) => k.length === 1 && ["c", "d", "e"].includes(k[0]))).toEqual([]);

    expect(result.funnel.groupsConfirmedHighConf).toBe(1);
    expect(result.funnel.llmCallsMade).toBe(1);
    // the merged 3-signal, 3-platform group passes the existing gate
    const passing = result.clusters.find((cl) => cl.signals.map((s) => s.id).sort().join() === "c,d,e");
    expect(passing?.passesBar).toBe(true);
  });

  it("surfaces low-confidence groups as borderline without merging them into clusters", async () => {
    vi.doMock("./arbiter", () => ({
      arbitrateGroup: vi.fn().mockResolvedValue({
        confirmedGroups: [],
        borderlineGroups: [{ signalIds: ["c", "d"], sharedProblemSummary: "maybe", confidence: "low" }],
      }),
    }));
    const { runTieredClustering } = await import("./tiered-clustering");

    const c = makeSignal("c", "devto", [1, 0]);
    const d = makeSignal("d", "lobsters", [0.7, 0.7141]);
    const result = await runTieredClustering([c, d]);

    expect(result.funnel.borderlineGroups).toBe(1);
    expect(result.funnel.groupsConfirmedHighConf).toBe(0);
    expect(result.funnel.groupsConfirmedMediumConf).toBe(0);
  });
});
