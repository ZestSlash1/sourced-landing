// sourced-clustering-upgrade-spec.md: three-stage funnel replacing the
// single hard-cutoff cosine pass, gated behind ENABLE_TIERED_CLUSTERING so it
// can run A/B against the existing single-threshold path (clustering.ts) on
// the same signal batch. No changes to pollers, embedding generation, draft
// generation, admin review, or publish — this only changes how clusters are
// formed before the existing MIN_CLUSTER_SIZE/MIN_CLUSTER_PLATFORMS gate.
//
// Deliberately separate thresholds from clustering.ts's own
// EMBEDDING_SIMILARITY_THRESHOLD (0.74, tuned for the non-tiered path) — the
// tiered funnel's auto-confirm/candidate bands are its own calibration and
// must not drift if either constant changes independently.
//
// No "server-only" import here — this module is unit-tested directly under
// Vitest (same reasoning as competitive-landscape.ts).
import { arbitrateGroup } from "./arbiter";
import { clusterFromPairs, MIN_CLUSTER_PLATFORMS, MIN_CLUSTER_SIZE, type SignalCluster } from "./clustering";
import { cosineSimilarity } from "./embeddings";
import { type CandidatePair, groupCandidates } from "./group-candidates";
import type { RawSignal } from "./types";

/** >= this cosine similarity: auto-confirmed same-cluster, no LLM call (cheap fast path for near-identical text). */
export const AUTO_CONFIRM_THRESHOLD = 0.82;
/** [this, AUTO_CONFIRM_THRESHOLD): candidate pair, queued for LLM arbitration. Below this: discarded, not a candidate. */
export const CANDIDATE_FLOOR_THRESHOLD = 0.55;

export interface TieredPairsResult {
  autoPairs: [number, number][];
  candidatePairs: CandidatePair[];
  pairsCompared: number;
}

/** Same pairwise-cosine sweep clustering.ts's in-process path runs, just widened into two bands instead of one pass/fail cutoff. */
export function computeTieredPairs(
  signals: RawSignal[],
  autoThreshold = AUTO_CONFIRM_THRESHOLD,
  candidateFloor = CANDIDATE_FLOOR_THRESHOLD,
): TieredPairsResult {
  const autoPairs: [number, number][] = [];
  const candidatePairs: CandidatePair[] = [];
  let pairsCompared = 0;

  for (let i = 0; i < signals.length; i++) {
    for (let j = i + 1; j < signals.length; j++) {
      pairsCompared++;
      if (!signals[i].embedding || !signals[j].embedding) continue;
      const score = cosineSimilarity(signals[i].embedding!, signals[j].embedding!);
      if (score >= autoThreshold) {
        autoPairs.push([i, j]);
      } else if (score >= candidateFloor) {
        candidatePairs.push({ signalAId: signals[i].id, signalBId: signals[j].id, score });
      }
    }
  }

  return { autoPairs, candidatePairs, pairsCompared };
}

function buildSignalCluster(signals: RawSignal[]): SignalCluster {
  const platforms = new Set(signals.map((s) => s.source));
  const platformCount = platforms.size;
  return {
    key: signals[0].id,
    signals,
    passesBar: signals.length >= MIN_CLUSTER_SIZE && platformCount >= MIN_CLUSTER_PLATFORMS,
    platformCount,
    crossPlatform: platformCount >= 2,
  };
}

export interface TieredClusteringFunnel {
  candidatesFound: number;
  groupsAfterArbitration: number;
  groupsConfirmedHighConf: number;
  groupsConfirmedMediumConf: number;
  groupsPassingGate: number;
  llmCallsMade: number;
  llmCostUsd: number;
  borderlineGroups: number;
  arbiterErrors: string[];
}

export interface TieredClusteringResult {
  clusters: SignalCluster[];
  stats: {
    signalsConsidered: number;
    pairsCompared: number;
    clustersFormed: number;
    clustersPassingBar: number;
    clustersPassingBarSinglePlatform: number;
    clustersPassingBarMultiPlatform: number;
    similarityThreshold: number;
    minClusterSize: number;
    minClusterPlatforms: number;
    strategy: "embedding";
    signalsMissingEmbedding: number;
  };
  funnel: TieredClusteringFunnel;
}

/**
 * Runs the full funnel: candidate discovery (loosened two-band threshold) ->
 * union-find grouping of the middle band -> one LLM arbiter call per group ->
 * merge auto-confirmed + LLM-confirmed groups, then hand off to the existing
 * MIN_CLUSTER_SIZE/MIN_CLUSTER_PLATFORMS gate (clustering.ts) unchanged.
 * Local Ollama only — no per-call API cost, so llmCostUsd stays 0.
 */
export async function runTieredClustering(signals: RawSignal[]): Promise<TieredClusteringResult> {
  const { autoPairs, candidatePairs, pairsCompared } = computeTieredPairs(signals);
  const autoResult = clusterFromPairs(signals, autoPairs, AUTO_CONFIRM_THRESHOLD, pairsCompared);

  const candidateGroupsOfIds = groupCandidates(candidatePairs);
  const signalById = new Map(signals.map((s) => [s.id, s]));

  const confirmedGroups: RawSignal[][] = [];
  let groupsConfirmedHighConf = 0;
  let groupsConfirmedMediumConf = 0;
  let borderlineGroups = 0;
  let llmCallsMade = 0;
  const arbiterErrors: string[] = [];

  for (const groupIds of candidateGroupsOfIds) {
    llmCallsMade++;
    const { confirmedGroups: cg, borderlineGroups: bg, error } = await arbitrateGroup(groupIds, signals);
    if (error) arbiterErrors.push(error);
    for (const g of cg) {
      const groupSignals = g.signalIds.map((id) => signalById.get(id)).filter((s): s is RawSignal => Boolean(s));
      if (groupSignals.length < 2) continue;
      confirmedGroups.push(groupSignals);
      if (g.confidence === "high") groupsConfirmedHighConf++;
      else groupsConfirmedMediumConf++;
    }
    borderlineGroups += bg.length;
  }

  // A signal folded into an LLM-confirmed group shouldn't also linger as its
  // own auto-cluster singleton.
  const confirmedIds = new Set(confirmedGroups.flat().map((s) => s.id));
  const mergedClusters: SignalCluster[] = [
    ...autoResult.clusters.filter((c) => !c.signals.some((s) => confirmedIds.has(s.id))),
    ...confirmedGroups.map(buildSignalCluster),
  ];

  const passingBar = mergedClusters.filter((c) => c.passesBar);
  const clustersPassingBarSinglePlatform = passingBar.filter((c) => !c.crossPlatform).length;
  const clustersPassingBarMultiPlatform = passingBar.filter((c) => c.crossPlatform).length;

  return {
    clusters: mergedClusters,
    stats: {
      signalsConsidered: signals.length,
      pairsCompared,
      clustersFormed: mergedClusters.length,
      clustersPassingBar: passingBar.length,
      clustersPassingBarSinglePlatform,
      clustersPassingBarMultiPlatform,
      similarityThreshold: AUTO_CONFIRM_THRESHOLD,
      minClusterSize: MIN_CLUSTER_SIZE,
      minClusterPlatforms: MIN_CLUSTER_PLATFORMS,
      strategy: "embedding",
      signalsMissingEmbedding: signals.filter((s) => !s.embedding).length,
    },
    funnel: {
      candidatesFound: candidatePairs.length,
      groupsAfterArbitration: confirmedGroups.length,
      groupsConfirmedHighConf,
      groupsConfirmedMediumConf,
      groupsPassingGate: passingBar.length,
      llmCallsMade,
      llmCostUsd: 0,
      borderlineGroups,
      arbiterErrors,
    },
  };
}
