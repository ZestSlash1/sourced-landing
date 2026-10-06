// sourced-clustering-upgrade-spec.md Part 2: persists the loosened-band
// (0.55-0.82 cosine) candidate pairs found during tiered clustering, tagged
// pending_review, so a signal that's a candidate against several others
// isn't forced into raw_signals' single cluster_key column.
import "server-only";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import type { CandidatePair } from "./group-candidates";

const TABLE = "candidate_pairs";

/** Never throws — candidate pairs are an observability/audit trail, not load-bearing for the pipeline run itself. */
export async function saveCandidatePairs(pairs: CandidatePair[], pipelineRunId: string | null): Promise<void> {
  if (pairs.length === 0) return;
  try {
    const supabase = getSupabaseServerClient();
    const { error } = await supabase.from(TABLE).insert(
      pairs.map((p) => ({
        signal_a_id: p.signalAId,
        signal_b_id: p.signalBId,
        cosine_score: p.score,
        pipeline_run_id: pipelineRunId,
      })),
    );
    if (error) console.error("[candidate_pairs] insert failed:", error.message);
  } catch (err) {
    console.error("[candidate_pairs] insert threw:", err);
  }
}
