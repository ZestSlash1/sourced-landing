import "server-only";
import { upsertIdeaDrop } from "@/lib/idea-drops/repository";
import { clusterSignals } from "./clustering";
import { draftIdeaFromCluster } from "./draft-model";
import { DAILY_DRAFT_CAP, draftsCreatedToday } from "./daily-cap";
import { generateMissingEmbeddings } from "./embeddings";
import {
  listUndraftedSignals,
  markSignalsDrafted,
  persistClusterKeys,
  saveEmbeddings,
} from "./raw-signals-repository";
import { recordPipelineRun } from "./pipeline-runs-repository";

export interface DraftPassResult {
  signalsConsidered: number;
  clustersFormed: number;
  clustersPassingBar: number;
  drafted: number;
  skippedAtCap: boolean;
  similarityThreshold: number;
  embeddingsGenerated: number;
  embeddingErrors: string[];
  errors: string[];
}

/**
 * The A2->A3 pipeline: cluster whatever's undrafted, PERSIST the resulting
 * cluster_key on every clustered signal (so the grouping is inspectable in
 * the DB even when no cluster clears the evidence bar), then draft up to
 * whatever's left of today's cap. Every run is logged to pipeline_runs for
 * observability — the previous version threw the clustering result away
 * silently, which made a broken step and a legitimately empty pool
 * indistinguishable.
 */
export async function runDraftPass(): Promise<DraftPassResult> {
  const [signals, alreadyToday] = await Promise.all([listUndraftedSignals(), draftsCreatedToday()]);

  // Embed whatever's new since the last pass before clustering runs, so
  // cosine-similarity clustering always has a full vector set to compare
  // over. Failures here don't abort the pass — a signal without an embedding
  // just clusters as its own singleton (see clusterSignals).
  const { results: embeddingResults, stats: embeddingStats } = await generateMissingEmbeddings(signals);
  try {
    await saveEmbeddings(embeddingResults);
  } catch (err) {
    embeddingStats.errors.push(err instanceof Error ? err.message : String(err));
  }
  const embeddingBySignalId = new Map(embeddingResults.map((r) => [r.signalId, r.embedding]));
  for (const signal of signals) {
    const embedding = embeddingBySignalId.get(signal.id);
    if (embedding) signal.embedding = embedding;
  }

  const { clusters, stats } = clusterSignals(signals);

  // Persist cluster_key for every signal in a non-trivial cluster. Singletons
  // stay null — they're not really "clustered" and marking them would just add
  // noise in queries.
  const assignments = clusters
    .filter((c) => c.signals.length > 1)
    .flatMap((c) => c.signals.map((s) => ({ signalId: s.id, clusterKey: c.key })));
  try {
    await persistClusterKeys(assignments);
  } catch (err) {
    console.error("[runDraftPass] persistClusterKeys failed:", err);
  }

  const passing = clusters.filter((c) => c.passesBar);
  const remaining = Math.max(0, DAILY_DRAFT_CAP - alreadyToday);
  const errors: string[] = [];
  let drafted = 0;

  for (const cluster of passing.slice(0, remaining)) {
    try {
      const idea = await draftIdeaFromCluster(cluster);
      const saved = await upsertIdeaDrop(idea);
      await markSignalsDrafted(
        cluster.signals.map((s) => s.id),
        saved.id,
      );
      drafted++;
    } catch (err) {
      errors.push(err instanceof Error ? err.message : String(err));
    }
  }

  console.log(
    `[runDraftPass] signals=${stats.signalsConsidered} embedded=${embeddingStats.generated} pairs=${stats.pairsCompared} ` +
      `clusters=${stats.clustersFormed} passing=${stats.clustersPassingBar} drafted=${drafted}`,
  );

  await recordPipelineRun({
    signalsConsidered: stats.signalsConsidered,
    pairsCompared: stats.pairsCompared,
    clustersFormed: stats.clustersFormed,
    clustersPassingBar: stats.clustersPassingBar,
    drafted,
    similarityThreshold: stats.similarityThreshold,
    minClusterSize: stats.minClusterSize,
    minClusterPlatforms: stats.minClusterPlatforms,
    embeddingsGenerated: embeddingStats.generated,
    embeddingErrors: embeddingStats.errors,
    embeddingCostUsd: embeddingStats.costUsd,
    errors,
  });

  return {
    signalsConsidered: stats.signalsConsidered,
    clustersFormed: stats.clustersFormed,
    clustersPassingBar: stats.clustersPassingBar,
    drafted,
    skippedAtCap: remaining === 0 && passing.length > 0,
    similarityThreshold: stats.similarityThreshold,
    embeddingsGenerated: embeddingStats.generated,
    embeddingErrors: embeddingStats.errors,
    errors,
  };
}
