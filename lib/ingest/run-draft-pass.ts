import "server-only";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { upsertIdeaDrop } from "@/lib/idea-drops/repository";
import { CLASSIFICATION_CONFIDENCE_FLOOR, CLASSIFICATION_RUN_CAP, classifySignals } from "./classification";
import { checkCompetitiveLandscape } from "./competitive-landscape";
import { CLUSTERING_STRATEGY, clusterSignals, clusterSignalsSQL } from "./clustering";
import { draftIdeaFromCluster } from "./draft-model";
import { DAILY_DRAFT_CAP, draftsCreatedToday } from "./daily-cap";
import { generateMissingEmbeddings } from "./embeddings";
import { assertClassifierConfigured, logClassifierStartup } from "@/lib/llm/classifier";
import { assertDraftGeneratorConfigured, logDraftGeneratorStartup } from "@/lib/llm/draft-generator";
import {
  listUndraftedSignals,
  markSignalsDrafted,
  persistClusterKeys,
  saveClassifications,
  saveEmbeddings,
} from "./raw-signals-repository";
import { recordPipelineRun } from "./pipeline-runs-repository";

export interface DraftPassResult {
  signalsConsidered: number;
  classifiedComplaint: number;
  classifiedNonComplaint: number;
  classificationErrors: string[];
  clustersFormed: number;
  clustersPassingBar: number;
  clustersPassingBarSinglePlatform: number;
  clustersPassingBarMultiPlatform: number;
  clusterSizeDistribution: Record<string, number>;
  drafted: number;
  skippedAtCap: boolean;
  similarityThreshold: number;
  embeddingsGenerated: number;
  embeddingErrors: string[];
  competitiveChecksRun: number;
  competitiveCheckErrors: string[];
  errors: string[];
}

function sizeDistribution(clusters: { signals: unknown[] }[]): Record<string, number> {
  const distribution: Record<string, number> = {};
  for (const c of clusters) {
    const key = c.signals.length >= 4 ? "4+" : String(c.signals.length);
    distribution[key] = (distribution[key] ?? 0) + 1;
  }
  return distribution;
}

/**
 * The A2->A3 pipeline, now with a complaint-classification stage between
 * polling and embedding (sourced-pipeline-quality-spec.md Part 2): every
 * undrafted signal missing a classification gets one LLM call, is persisted,
 * and only classified complaints above CLASSIFICATION_CONFIDENCE_FLOOR ever
 * reach embedding/clustering. Non-complaints are kept (not deleted) for
 * audit and /rejected, just excluded from the clustering pool. Embedding
 * runs on problem_statement, not raw title/body (see embeddings.ts).
 *
 * Clustering threshold and min-signals/min-platforms bar are unchanged — see
 * clustering.ts. Every run is logged to pipeline_runs for observability.
 */
export async function runDraftPass(): Promise<DraftPassResult> {
  assertClassifierConfigured();
  logClassifierStartup();
  assertDraftGeneratorConfigured();
  logDraftGeneratorStartup();

  const [signals, alreadyToday] = await Promise.all([listUndraftedSignals(), draftsCreatedToday()]);

  const unclassified = signals.filter((s) => s.classifiedAsComplaint === null);
  const { results: classificationResults, stats: classificationStats } = await classifySignals(unclassified, {
    cap: CLASSIFICATION_RUN_CAP,
  });
  try {
    await saveClassifications(
      classificationResults.map((r) => ({
        signalId: r.signalId,
        isComplaint: r.result.isComplaint,
        problemStatement: r.result.problemStatement,
        domain: r.result.domain,
        confidence: r.result.confidence,
      })),
    );
  } catch (err) {
    classificationStats.errors.push(err instanceof Error ? err.message : String(err));
  }

  const classificationBySignalId = new Map(classificationResults.map((r) => [r.signalId, r.result]));
  for (const signal of signals) {
    const c = classificationBySignalId.get(signal.id);
    if (!c) continue;
    signal.classifiedAsComplaint = c.isComplaint;
    signal.problemStatement = c.problemStatement;
    signal.domain = c.domain;
    signal.classificationConfidence = c.confidence;
  }

  const classifiedComplaint = signals.filter((s) => s.classifiedAsComplaint === true).length;
  const classifiedNonComplaint = signals.filter((s) => s.classifiedAsComplaint === false).length;

  // Only classified complaints above the confidence floor ever reach
  // embedding/clustering — everything else stays a stored, audit-visible
  // singleton with no cluster_key.
  const complaintSignals = signals.filter(
    (s) => s.classifiedAsComplaint === true && (s.classificationConfidence ?? 0) >= CLASSIFICATION_CONFIDENCE_FLOOR,
  );

  const { results: embeddingResults, stats: embeddingStats } = await generateMissingEmbeddings(complaintSignals);
  try {
    await saveEmbeddings(embeddingResults);
  } catch (err) {
    embeddingStats.errors.push(err instanceof Error ? err.message : String(err));
  }
  const embeddingBySignalId = new Map(embeddingResults.map((r) => [r.signalId, r.embedding]));
  for (const signal of complaintSignals) {
    const embedding = embeddingBySignalId.get(signal.id);
    if (embedding) signal.embedding = embedding;
  }

  // pgvector migration Phase D (pgvector-migration-spec.md): the embedding
  // strategy now sources candidate pairs from the HNSW-indexed
  // find_signal_neighbors RPC instead of the in-process O(n^2) cosine loop.
  // CLUSTERING_STRATEGY=jaccard keeps using the original in-process path,
  // same as before this migration.
  const useSqlClustering = process.env.CLUSTERING_ENGINE === "sql";
  const { clusters, stats } =
    CLUSTERING_STRATEGY === "embedding" && useSqlClustering
      ? await clusterSignalsSQL(getSupabaseServerClient(), complaintSignals)
      : clusterSignals(complaintSignals);

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
  const competitiveCheckErrors: string[] = [];
  let drafted = 0;
  let competitiveChecksRun = 0;
  let competitiveCheckCostUsd = 0;
  let omnirouteCalls = 0;
  let draftOpenrouterCalls = 0;
  let omnirouteLatencyMsTotal = 0;
  let draftOpenrouterLatencyMsTotal = 0;
  let draftFallbacks = 0;

  for (const cluster of passing.slice(0, remaining)) {
    try {
      const { idea, provider, latencyMs, fellBack } = await draftIdeaFromCluster(cluster);

      if (fellBack) draftFallbacks++;
      if (provider === "omniroute") {
        omnirouteCalls++;
        omnirouteLatencyMsTotal += latencyMs;
      } else if (provider === "openrouter") {
        draftOpenrouterCalls++;
        draftOpenrouterLatencyMsTotal += latencyMs;
      }

      // Competitive gap check (sourced-competitive-gap-spec.md): one real,
      // logged web search per cluster, same cadence as drafting. A failed
      // or unusable search leaves competitiveLandscape null — the idea
      // still gets drafted, it just goes to review without that section
      // rather than with a fabricated one.
      try {
        const { result, costUsd } = await checkCompetitiveLandscape(idea.problem.summary);
        idea.competitiveLandscape = result;
        competitiveChecksRun++;
        competitiveCheckCostUsd += costUsd;
      } catch (err) {
        competitiveCheckErrors.push(`${idea.id}: ${err instanceof Error ? err.message : String(err)}`);
      }

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

  const clusterSizeDistribution = sizeDistribution(clusters);

  console.log(
    `[runDraftPass] signals=${signals.length} complaints=${classifiedComplaint} non-complaints=${classifiedNonComplaint} ` +
      `embedded=${embeddingStats.generated} pairs=${stats.pairsCompared} clusters=${stats.clustersFormed} ` +
      `passing=${stats.clustersPassingBar} distribution=${JSON.stringify(clusterSizeDistribution)} drafted=${drafted}`,
  );

  await recordPipelineRun({
    signalsConsidered: stats.signalsConsidered,
    pairsCompared: stats.pairsCompared,
    clustersFormed: stats.clustersFormed,
    clustersPassingBar: stats.clustersPassingBar,
    clustersPassingBarSinglePlatform: stats.clustersPassingBarSinglePlatform,
    clustersPassingBarMultiPlatform: stats.clustersPassingBarMultiPlatform,
    drafted,
    similarityThreshold: stats.similarityThreshold,
    minClusterSize: stats.minClusterSize,
    minClusterPlatforms: stats.minClusterPlatforms,
    embeddingsGenerated: embeddingStats.generated,
    embeddingErrors: embeddingStats.errors,
    embeddingCostUsd: embeddingStats.costUsd,
    classifiedComplaint,
    classifiedNonComplaint,
    classificationErrors: classificationStats.errors,
    classificationCostUsd: classificationStats.costUsd,
    ollamaCalls: classificationStats.ollamaCalls,
    openrouterCalls: classificationStats.openrouterCalls,
    ollamaAvgLatencyMs:
      classificationStats.ollamaCalls > 0 ? classificationStats.ollamaLatencyMsTotal / classificationStats.ollamaCalls : 0,
    openrouterAvgLatencyMs:
      classificationStats.openrouterCalls > 0
        ? classificationStats.openrouterLatencyMsTotal / classificationStats.openrouterCalls
        : 0,
    classifierFallbacks: classificationStats.fallbacks,
    classifierParseFailures: classificationStats.parseFailures,
    clusterSizeDistribution,
    competitiveChecksRun,
    competitiveCheckErrors,
    competitiveCheckCostUsd,
    omnirouteCalls,
    draftOpenrouterCalls,
    omnirouteAvgLatencyMs: omnirouteCalls > 0 ? omnirouteLatencyMsTotal / omnirouteCalls : 0,
    draftOpenrouterAvgLatencyMs: draftOpenrouterCalls > 0 ? draftOpenrouterLatencyMsTotal / draftOpenrouterCalls : 0,
    draftFallbacks,
    errors,
  });

  return {
    signalsConsidered: stats.signalsConsidered,
    classifiedComplaint,
    classifiedNonComplaint,
    classificationErrors: classificationStats.errors,
    clustersFormed: stats.clustersFormed,
    clustersPassingBar: stats.clustersPassingBar,
    clustersPassingBarSinglePlatform: stats.clustersPassingBarSinglePlatform,
    clustersPassingBarMultiPlatform: stats.clustersPassingBarMultiPlatform,
    clusterSizeDistribution,
    drafted,
    skippedAtCap: remaining === 0 && passing.length > 0,
    similarityThreshold: stats.similarityThreshold,
    embeddingsGenerated: embeddingStats.generated,
    embeddingErrors: embeddingStats.errors,
    competitiveChecksRun,
    competitiveCheckErrors,
    errors,
  };
}
