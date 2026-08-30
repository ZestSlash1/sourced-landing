import { cosineSimilarity } from "./embeddings";
import { STOPWORDS } from "./stopwords";
import type { RawSignal } from "./types";

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

// Legacy word-overlap clustering. Kept for comparison/revert only — every
// non-singleton cluster it ever produced across 370 signals / 5 sources was
// single-platform (bar one coincidental-keyword false positive), because
// Jaccard measures vocabulary overlap and the same complaint uses different
// words on different platforms. Not used unless CLUSTERING_STRATEGY=jaccard.
export const JACCARD_SIMILARITY_THRESHOLD = 0.15;

// Cosine similarity on openai/text-embedding-3-small vectors. 0.82 is a
// commonly-cited starting point for that model, not a converted-from-Jaccard
// number — the two metrics aren't comparable, so this is the independent
// baseline to tune from (see scripts/cluster-dry-run.ts --threshold).
export const EMBEDDING_SIMILARITY_THRESHOLD = 0.82;

export const MIN_CLUSTER_SIZE = 3;
export const MIN_CLUSTER_PLATFORMS = 2;

export type ClusteringStrategy = "embedding" | "jaccard";

// Override with CLUSTERING_STRATEGY=jaccard to revert/compare without a code change.
export const CLUSTERING_STRATEGY: ClusteringStrategy =
  process.env.CLUSTERING_STRATEGY === "jaccard" ? "jaccard" : "embedding";

export interface SignalCluster {
  key: string;
  signals: RawSignal[];
  passesBar: boolean;
}

export interface ClusterResult {
  clusters: SignalCluster[];
  stats: {
    signalsConsidered: number;
    pairsCompared: number;
    clustersFormed: number;
    clustersPassingBar: number;
    similarityThreshold: number;
    minClusterSize: number;
    minClusterPlatforms: number;
    strategy: ClusteringStrategy;
    signalsMissingEmbedding: number;
  };
}

export interface ClusterOptions {
  strategy?: ClusteringStrategy;
  threshold?: number;
}

/**
 * Single-link clustering (union-find over pairwise similarity). Returns
 * EVERY group (including singletons and clusters that miss the 3+/2+ bar),
 * each tagged with `passesBar`, plus per-run stats. The caller decides which
 * clusters to draft and is responsible for persisting cluster_key so we don't
 * silently lose the grouping.
 *
 * Default strategy is cosine similarity over embeddings (see
 * EMBEDDING_SIMILARITY_THRESHOLD) — Jaccard is kept behind
 * CLUSTERING_STRATEGY=jaccard for comparison/revert, see the note above.
 * A signal missing an embedding can't be compared under the embedding
 * strategy and is left as its own singleton rather than silently dropped.
 */
export function clusterSignals(signals: RawSignal[], options: ClusterOptions = {}): ClusterResult {
  const strategy = options.strategy ?? CLUSTERING_STRATEGY;
  const threshold =
    options.threshold ?? (strategy === "jaccard" ? JACCARD_SIMILARITY_THRESHOLD : EMBEDDING_SIMILARITY_THRESHOLD);

  const keywords = strategy === "jaccard" ? signals.map(keywordSet) : null;
  const signalsMissingEmbedding = strategy === "embedding" ? signals.filter((s) => !s.embedding).length : 0;

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

  let pairsCompared = 0;
  for (let i = 0; i < signals.length; i++) {
    for (let j = i + 1; j < signals.length; j++) {
      pairsCompared++;
      const similarity =
        strategy === "jaccard"
          ? jaccard(keywords![i], keywords![j])
          : signals[i].embedding && signals[j].embedding
            ? cosineSimilarity(signals[i].embedding!, signals[j].embedding!)
            : 0;
      if (similarity >= threshold) union(i, j);
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
  let clustersPassingBar = 0;
  Array.from(groups.values()).forEach((group) => {
    const platforms = new Set(group.map((s) => s.source));
    const passesBar = group.length >= MIN_CLUSTER_SIZE && platforms.size >= MIN_CLUSTER_PLATFORMS;
    if (passesBar) clustersPassingBar++;
    clusters.push({ key: group[0].id, signals: group, passesBar });
  });

  return {
    clusters,
    stats: {
      signalsConsidered: signals.length,
      pairsCompared,
      clustersFormed: clusters.length,
      clustersPassingBar,
      similarityThreshold: threshold,
      minClusterSize: MIN_CLUSTER_SIZE,
      minClusterPlatforms: MIN_CLUSTER_PLATFORMS,
      strategy,
      signalsMissingEmbedding,
    },
  };
}
