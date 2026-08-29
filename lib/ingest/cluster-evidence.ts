import { completeJson } from "@/lib/llm/anthropic";
import type { Evidence } from "@/types/idea-drop";

const SYSTEM_PROMPT = `You cluster pieces of evidence for Sourced. Given a
numbered list of evidence summaries (index + quote), group the indices that
describe the SAME underlying problem, even if worded differently.

This is intentionally loose — false positives (grouping loosely-related
items together) are fine, a downstream evidence-validation step will
hard-reject anything under-evidenced. Only skip an item entirely if it
shares no plausible problem with anything else in the list.

Return ONLY a JSON object, no preamble, no markdown fences:
{"clusters": number[][]}
Each inner array is a list of the 0-based indices belonging to one cluster.`;

interface ClusterResult {
  clusters: number[][];
}

/**
 * Groups evidence describing the same underlying problem. Only clusters
 * with 2+ items are returned as candidate drafts — matches
 * sourced-phase2-spec.md Task 1.3 ("each group with 2+ items becomes a
 * candidate draft").
 */
export async function clusterEvidence(evidence: Evidence[]): Promise<Evidence[][]> {
  if (evidence.length === 0) return [];

  const user = JSON.stringify(
    evidence.map((e, i) => ({ index: i, quote: e.quote }))
  );

  const { clusters } = await completeJson<ClusterResult>({
    system: SYSTEM_PROMPT,
    user,
    maxTokens: 1024,
  });

  return clusters
    .filter((indices) => indices.length >= 2)
    .map((indices) => indices.map((i) => evidence[i]).filter(Boolean));
}
