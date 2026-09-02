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
  // ollama-classification-spec.md: local/remote classifier provider mix.
  ollamaCalls: number;
  openrouterCalls: number;
  ollamaAvgLatencyMs: number;
  openrouterAvgLatencyMs: number;
  classifierFallbacks: number;
  classifierParseFailures: number;
  clusterSizeDistribution: Record<string, number>;
  competitiveChecksRun: number;
  competitiveCheckErrors: string[];
  competitiveCheckCostUsd: number;
  // omniroute-drafts-and-ollama-lockin-spec.md: local/remote draft-generation
  // provider mix, same pattern as the classifier's ollama/openrouter fields.
  omnirouteCalls: number;
  draftOpenrouterCalls: number;
  omnirouteAvgLatencyMs: number;
  draftOpenrouterAvgLatencyMs: number;
  draftFallbacks: number;
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
      ollama_calls: stats.ollamaCalls,
      openrouter_calls: stats.openrouterCalls,
      ollama_avg_latency_ms: stats.ollamaAvgLatencyMs,
      openrouter_avg_latency_ms: stats.openrouterAvgLatencyMs,
      classifier_fallbacks: stats.classifierFallbacks,
      classifier_parse_failures: stats.classifierParseFailures,
      cluster_size_distribution: stats.clusterSizeDistribution,
      competitive_checks_run: stats.competitiveChecksRun,
      competitive_check_errors: stats.competitiveCheckErrors,
      competitive_check_cost_usd: stats.competitiveCheckCostUsd,
      omniroute_calls: stats.omnirouteCalls,
      draft_openrouter_calls: stats.draftOpenrouterCalls,
      omniroute_avg_latency_ms: stats.omnirouteAvgLatencyMs,
      draft_openrouter_avg_latency_ms: stats.draftOpenrouterAvgLatencyMs,
      draft_fallbacks: stats.draftFallbacks,
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
    ollama_calls: number | null;
    openrouter_calls: number | null;
    ollama_avg_latency_ms: number | null;
    openrouter_avg_latency_ms: number | null;
    classifier_fallbacks: number | null;
    classifier_parse_failures: number | null;
    cluster_size_distribution: Record<string, number> | null;
    competitive_checks_run: number | null;
    competitive_check_errors: string[] | null;
    competitive_check_cost_usd: number | null;
    omniroute_calls: number | null;
    draft_openrouter_calls: number | null;
    omniroute_avg_latency_ms: number | null;
    draft_openrouter_avg_latency_ms: number | null;
    draft_fallbacks: number | null;
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
    ollamaCalls: r.ollama_calls ?? 0,
    openrouterCalls: r.openrouter_calls ?? 0,
    ollamaAvgLatencyMs: r.ollama_avg_latency_ms ?? 0,
    openrouterAvgLatencyMs: r.openrouter_avg_latency_ms ?? 0,
    classifierFallbacks: r.classifier_fallbacks ?? 0,
    classifierParseFailures: r.classifier_parse_failures ?? 0,
    clusterSizeDistribution: r.cluster_size_distribution ?? {},
    competitiveChecksRun: r.competitive_checks_run ?? 0,
    competitiveCheckErrors: r.competitive_check_errors ?? [],
    competitiveCheckCostUsd: r.competitive_check_cost_usd ?? 0,
    omnirouteCalls: r.omniroute_calls ?? 0,
    draftOpenrouterCalls: r.draft_openrouter_calls ?? 0,
    omnirouteAvgLatencyMs: r.omniroute_avg_latency_ms ?? 0,
    draftOpenrouterAvgLatencyMs: r.draft_openrouter_avg_latency_ms ?? 0,
    draftFallbacks: r.draft_fallbacks ?? 0,
    errors: r.errors ?? [],
  }));
}
