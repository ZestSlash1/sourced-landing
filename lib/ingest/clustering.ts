import type { RawSignal } from "./types";

const STOPWORDS = new Set([
  "the", "a", "an", "is", "are", "was", "were", "and", "or", "but", "to", "of", "in", "on", "for",
  "with", "that", "this", "it", "i", "you", "we", "they", "my", "your", "our", "be", "has", "have",
  "had", "do", "does", "did", "not", "no", "so", "if", "as", "at", "by", "from", "there", "here",
  "just", "like", "can", "could", "would", "should", "will", "im", "its", "any", "all", "how",
]);

function keywordSet(signal: RawSignal): Set<string> {
  const text = `${signal.title ?? ""} ${signal.text}`.toLowerCase();
  const words = text.match(/[a-z][a-z'-]{2,}/g) ?? [];
  return new Set(words.filter((w) => !STOPWORDS.has(w)));
}

function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let intersection = 0;
  Array.from(a).forEach((word) => {
    if (b.has(word)) intersection++;
  });
  const union = a.size + b.size - intersection;
  return intersection / union;
}

const SIMILARITY_THRESHOLD = 0.15;
const MIN_CLUSTER_SIZE = 3; // matches validateEvidence's minimum evidence count
const MIN_CLUSTER_PLATFORMS = 2; // matches validateEvidence's minimum platform spread

export interface SignalCluster {
  key: string;
  signals: RawSignal[];
}

/**
 * Groups undrafted signals describing the same underlying complaint (Part
 * A2's optional clustering step) by keyword overlap, then keeps only
 * clusters that could actually clear the evidence gate on their own
 * (validateEvidence: >=3 items, >=2 platforms) — there's no point spending
 * an LLM call on a cluster that would just land as needs_evidence anyway.
 *
 * This is deliberately simple (Jaccard over a stopword-filtered keyword
 * set, single-link clustering) rather than embeddings/semantic similarity —
 * cheap enough to run on every poller batch with no extra API cost.
 */
export function clusterSignals(signals: RawSignal[]): SignalCluster[] {
  const keywords = signals.map(keywordSet);
  const parent = signals.map((_, i) => i);

  function find(i: number): number {
    while (parent[i] !== i) {
      parent[i] = parent[parent[i]];
      i = parent[i];
    }
    return i;
  }
  function union(a: number, b: number) {
    const ra = find(a);
    const rb = find(b);
    if (ra !== rb) parent[ra] = rb;
  }

  for (let i = 0; i < signals.length; i++) {
    for (let j = i + 1; j < signals.length; j++) {
      if (jaccard(keywords[i], keywords[j]) >= SIMILARITY_THRESHOLD) union(i, j);
    }
  }

  const groups = new Map<number, RawSignal[]>();
  for (let i = 0; i < signals.length; i++) {
    const root = find(i);
    const group = groups.get(root) ?? [];
    group.push(signals[i]);
    groups.set(root, group);
  }

  const clusters: SignalCluster[] = [];
  Array.from(groups.values()).forEach((group) => {
    const platforms = new Set(group.map((s) => s.source));
    if (group.length < MIN_CLUSTER_SIZE || platforms.size < MIN_CLUSTER_PLATFORMS) return;
    clusters.push({ key: group[0].id, signals: group });
  });

  return clusters;
}
