import { describe, expect, it } from "vitest";
import { groupCandidates } from "./group-candidates";

describe("groupCandidates", () => {
  it("groups connected pairs into a single batch", () => {
    const groups = groupCandidates([
      { signalAId: "a", signalBId: "b", score: 0.6 },
      { signalAId: "b", signalBId: "c", score: 0.65 },
    ]);
    expect(groups).toHaveLength(1);
    expect(new Set(groups[0])).toEqual(new Set(["a", "b", "c"]));
  });

  it("keeps disconnected components as separate groups", () => {
    const groups = groupCandidates([
      { signalAId: "a", signalBId: "b", score: 0.6 },
      { signalAId: "c", signalBId: "d", score: 0.6 },
    ]);
    expect(groups).toHaveLength(2);
    const asSets = groups.map((g) => new Set(g));
    expect(asSets).toContainEqual(new Set(["a", "b"]));
    expect(asSets).toContainEqual(new Set(["c", "d"]));
  });

  it("splits an oversized connected component into chunks of maxGroupSize", () => {
    const pairs = [];
    for (let i = 0; i < 19; i++) {
      pairs.push({ signalAId: `s${i}`, signalBId: `s${i + 1}`, score: 0.6 });
    }
    const groups = groupCandidates(pairs, 5);
    expect(groups.length).toBeGreaterThan(1);
    for (const g of groups) expect(g.length).toBeLessThanOrEqual(5);
    const allIds = new Set(groups.flat());
    expect(allIds.size).toBe(20);
  });

  it("returns nothing for an empty pair list", () => {
    expect(groupCandidates([])).toEqual([]);
  });
});
