import "server-only";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export interface PipelineRunStats {
  signalsConsidered: number;
  pairsCompared: number;
  clustersFormed: number;
  clustersPassingBar: number;
  clustersPassingBarSinglePlatform: number;
  clustersPassingBarMultiPlatform: number;
  drafted: number;
  similarityThreshold: number;
  minClusterSize: number;
  minClusterPlatforms: number;
  embeddingsGenerated: number;
  embeddingErrors: string[];
  embeddingCostUsd: number;
  classifiedComplaint: number;
  classifiedNonComplaint: number;
  classificationErrors: string[];
  classificationCostUsd: number;
  clusterSizeDistribution: Record<string, number>;
  competitiveChecksRun: number;
  competitiveCheckErrors: string[];
  competitiveCheckCostUsd: number;
  errors: string[];
}

export interface PipelineRunRow extends PipelineRunStats {
  id: string;
  ranAt: string;
}

/** Records one draft-pass invocation for the observability panel. Never throws. */
export async function recordPipelineRun(stats: PipelineRunStats): Promise<void> {
  try {
    const supabase = getSupabaseServerClient();
    const { error } = await supabase.from("pipeline_runs").insert({
      signals_considered: stats.signalsConsidered,
      pairs_compared: stats.pairsCompared,
      clusters_formed: stats.clustersFormed,
      clusters_passing_bar: stats.clustersPassingBar,
      clusters_passing_bar_single_platform: stats.clustersPassingBarSinglePlatform,
      clusters_passing_bar_multi_platform: stats.clustersPassingBarMultiPlatform,
      drafted: stats.drafted,
      similarity_threshold: stats.similarityThreshold,
      min_cluster_size: stats.minClusterSize,
      min_cluster_platforms: stats.minClusterPlatforms,
      embeddings_generated: stats.embeddingsGenerated,
      embedding_errors: stats.embeddingErrors,
      embedding_cost_usd: stats.embeddingCostUsd,
      classified_complaint: stats.classifiedComplaint,
      classified_non_complaint: stats.classifiedNonComplaint,
      classification_errors: stats.classificationErrors,
      classification_cost_usd: stats.classificationCostUsd,
      cluster_size_distribution: stats.clusterSizeDistribution,
      competitive_checks_run: stats.competitiveChecksRun,
      competitive_check_errors: stats.competitiveCheckErrors,
      competitive_check_cost_usd: stats.competitiveCheckCostUsd,
      errors: stats.errors,
    });
    if (error) console.error("[pipeline_runs] insert failed:", error.message);
  } catch (err) {
    console.error("[pipeline_runs] insert threw:", err);
  }
}

export async function listRecentPipelineRuns(limit = 10): Promise<PipelineRunRow[]> {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("pipeline_runs")
    .select("*")
    .order("ran_at", { ascending: false })
    .limit(limit);
  if (error) {
    // Table may not exist yet in fresh envs; degrade gracefully rather than
    // breaking the analytics page.
    console.error("[pipeline_runs] list failed:", error.message);
    return [];
  }
  interface Row {
    id: string;
    ran_at: string;
    signals_considered: number;
    pairs_compared: number;
    clusters_formed: number;
    clusters_passing_bar: number;
    clusters_passing_bar_single_platform: number | null;
    clusters_passing_bar_multi_platform: number | null;
    drafted: number;
    similarity_threshold: number;
    min_cluster_size: number;
    min_cluster_platforms: number;
    embeddings_generated: number | null;
    embedding_errors: string[] | null;
    embedding_cost_usd: number | null;
    classified_complaint: number | null;
    classified_non_complaint: number | null;
    classification_errors: string[] | null;
    classification_cost_usd: number | null;
    cluster_size_distribution: Record<string, number> | null;
    competitive_checks_run: number | null;
    competitive_check_errors: string[] | null;
    competitive_check_cost_usd: number | null;
    errors: string[] | null;
  }
  return (data as Row[]).map((r) => ({
    id: r.id,
    ranAt: r.ran_at,
    signalsConsidered: r.signals_considered,
    pairsCompared: r.pairs_compared,
    clustersFormed: r.clusters_formed,
    clustersPassingBar: r.clusters_passing_bar,
    clustersPassingBarSinglePlatform: r.clusters_passing_bar_single_platform ?? 0,
    clustersPassingBarMultiPlatform: r.clusters_passing_bar_multi_platform ?? 0,
    drafted: r.drafted,
    similarityThreshold: r.similarity_threshold,
    minClusterSize: r.min_cluster_size,
    minClusterPlatforms: r.min_cluster_platforms,
    embeddingsGenerated: r.embeddings_generated ?? 0,
    embeddingErrors: r.embedding_errors ?? [],
    embeddingCostUsd: r.embedding_cost_usd ?? 0,
    classifiedComplaint: r.classified_complaint ?? 0,
    classifiedNonComplaint: r.classified_non_complaint ?? 0,
    classificationErrors: r.classification_errors ?? [],
    classificationCostUsd: r.classification_cost_usd ?? 0,
    clusterSizeDistribution: r.cluster_size_distribution ?? {},
    competitiveChecksRun: r.competitive_checks_run ?? 0,
    competitiveCheckErrors: r.competitive_check_errors ?? [],
    competitiveCheckCostUsd: r.competitive_check_cost_usd ?? 0,
    errors: r.errors ?? [],
  }));
}
