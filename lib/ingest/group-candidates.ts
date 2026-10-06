// sourced-clustering-upgrade-spec.md Part 3: groups the loosened-band
// (0.55-0.82 cosine) candidate pairs into small connected batches via
// union-find before they're sent to the LLM arbiter, capped at maxGroupSize
// so each arbiter call/response stays cheap and reliable.
export interface CandidatePair {
  signalAId: string;
  signalBId: string;
  score: number;
}

export function groupCandidates(pairs: CandidatePair[], maxGroupSize = 18): string[][] {
  const parent = new Map<string, string>();
  const find = (x: string): string => {
    if (!parent.has(x)) parent.set(x, x);
    if (parent.get(x) !== x) parent.set(x, find(parent.get(x)!));
    return parent.get(x)!;
  };
  const union = (a: string, b: string) => {
    const ra = find(a);
    const rb = find(b);
    if (ra !== rb) parent.set(ra, rb);
  };

  for (const p of pairs) union(p.signalAId, p.signalBId);

  const groups = new Map<string, Set<string>>();
  for (const p of pairs) {
    const root = find(p.signalAId);
    if (!groups.has(root)) groups.set(root, new Set());
    groups.get(root)!.add(p.signalAId);
    groups.get(root)!.add(p.signalBId);
  }

  const result: string[][] = [];
  Array.from(groups.values()).forEach((group) => {
    const ids = Array.from(group);
    for (let i = 0; i < ids.length; i += maxGroupSize) {
      result.push(ids.slice(i, i + maxGroupSize));
    }
  });
  return result;
}
