/**
 * Full dry-run harness (sourced-pipeline-quality-spec.md): runs every
 * keyless poller, applies Part 1 noise filters, inserts into raw_signals,
 * classifies whatever's unclassified (Part 2), then clusters the resulting
 * complaint pool and reports every Part 3 counter — WITHOUT persisting
 * cluster_key or drafting anything, so it's safe to run against production
 * data to see what a real pass would do before it does it.
 *
 * Reddit is skipped — it requires REDDIT_CLIENT_ID/SECRET which aren't
 * configured; pollReddit() itself already no-ops without them.
 *
 * Flags:
 *   --inspect-near-misses   diagnostic only: print the pairwise similarity
 *                           score distribution and the top 15 near-miss
 *                           pairs (below EMBEDDING_SIMILARITY_THRESHOLD) with
 *                           both problem statements. No clustering/threshold/
 *                           prompt changes, nothing persisted beyond what
 *                           this dry run already persists (embeddings).
 */
import { config } from "dotenv";
config({ path: ".env.local" });
import { createClient } from "@supabase/supabase-js";
import { pollHackerNews } from "../lib/ingest/pollers/hacker-news";
import { pollStackExchange } from "../lib/ingest/pollers/stack-exchange";
import { pollGithubIssues } from "../lib/ingest/pollers/github-issues";
import { pollDevTo } from "../lib/ingest/pollers/devto";
import { pollLobsters } from "../lib/ingest/pollers/lobsters";
import { pollGitlabIssues } from "../lib/ingest/pollers/gitlab-issues";
import { pollYoutubeComments } from "../lib/ingest/pollers/youtube";
import { pollCodeberg } from "../lib/ingest/pollers/codeberg";
import { pollDiscourse } from "../lib/ingest/pollers/discourse";
import { pollMastodon } from "../lib/ingest/pollers/mastodon";
import { pollBluesky } from "../lib/ingest/pollers/bluesky";
import { pollDevRant } from "../lib/ingest/pollers/devrant";
import { classifySignals, CLASSIFICATION_CONFIDENCE_FLOOR } from "../lib/ingest/classification";
import { logClassifierStartup } from "../lib/llm/classifier";
import { clusterSignals, EMBEDDING_SIMILARITY_THRESHOLD } from "../lib/ingest/clustering";
import { generateMissingEmbeddings, cosineSimilarity, parseEmbeddingField } from "../lib/ingest/embeddings";
import type { PollResult, RawSignal, RawSignalInput } from "../lib/ingest/types";

const inspectNearMisses = process.argv.includes("--inspect-near-misses");
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });

async function insertRawSignals(signals: RawSignalInput[]): Promise<number> {
  if (signals.length === 0) return 0;
  const { data, error } = await sb
    .from("raw_signals")
    .upsert(
      signals.map((s) => ({
        source: s.source,
        url: s.url,
        title: s.title,
        text: s.text,
        author: s.author,
        engagement_metric: s.engagementMetric,
        posted_at: s.postedAt,
      })),
      { onConflict: "url", ignoreDuplicates: true },
    )
    .select("id");
  if (error) throw new Error(error.message);
  return (data as { id: string }[]).length;
}

interface RawSignalRow {
  id: string;
  source: RawSignal["source"];
  url: string;
  title: string | null;
  text: string;
  author: string | null;
  engagement_metric: number;
  posted_at: string | null;
  fetched_at: string;
  cluster_key: string | null;
  drafted_idea_id: string | null;
  embedding: unknown;
  classified_as_complaint: boolean | null;
  problem_statement: string | null;
  domain: string | null;
  classification_confidence: number | null;
}

function rowToSignal(row: RawSignalRow): RawSignal {
  return {
    id: row.id,
    source: row.source,
    url: row.url,
    title: row.title,
    text: row.text,
    author: row.author,
    engagementMetric: row.engagement_metric,
    postedAt: row.posted_at,
    fetchedAt: row.fetched_at,
    clusterKey: row.cluster_key,
    draftedIdeaId: row.drafted_idea_id,
    embedding: parseEmbeddingField(row.embedding),
    classifiedAsComplaint: row.classified_as_complaint,
    problemStatement: row.problem_statement,
    domain: row.domain,
    classificationConfidence: row.classification_confidence,
  };
}

async function fetchAllUndrafted(): Promise<RawSignal[]> {
  const { data, error } = await sb.from("raw_signals").select("*").is("drafted_idea_id", null);
  if (error) throw new Error(error.message);
  return (data as RawSignalRow[]).map(rowToSignal);
}

async function saveEmbeddings(updates: { signalId: string; embedding: number[] }[]): Promise<void> {
  for (const { signalId, embedding } of updates) {
    const { error } = await sb.rpc("set_signal_embedding_vec", { p_id: signalId, p_vec: `[${embedding.join(",")}]` });
    if (error) throw new Error(error.message);
  }
}

async function saveClassifications(
  updates: { signalId: string; isComplaint: boolean; problemStatement: string | null; domain: string | null; confidence: number }[],
): Promise<void> {
  for (const u of updates) {
    const { error } = await sb
      .from("raw_signals")
      .update({
        classified_as_complaint: u.isComplaint,
        problem_statement: u.problemStatement,
        domain: u.domain,
        classification_confidence: u.confidence,
        classified_at: new Date().toISOString(),
      })
      .eq("id", u.signalId);
    if (error) throw new Error(error.message);
  }
}

const POLLERS: { name: string; fn: () => Promise<PollResult> }[] = [
  { name: "hackernews", fn: pollHackerNews },
  { name: "stackexchange", fn: pollStackExchange },
  { name: "github", fn: pollGithubIssues },
  { name: "devto", fn: pollDevTo },
  { name: "lobsters", fn: pollLobsters },
  { name: "gitlab", fn: pollGitlabIssues },
  { name: "youtube", fn: pollYoutubeComments },
  { name: "codeberg", fn: pollCodeberg },
  { name: "discourse", fn: pollDiscourse },
  { name: "mastodon", fn: pollMastodon },
  { name: "bluesky", fn: pollBluesky },
  { name: "devrant", fn: pollDevRant },
];

async function main() {
  logClassifierStartup();
  const pollReport: { source: string; fetched: number; noiseFiltered: number; inserted: number; error?: string }[] = [];

  for (const { name, fn } of POLLERS) {
    try {
      const { signals, noiseFiltered } = await fn();
      const inserted = await insertRawSignals(signals);
      pollReport.push({ source: name, fetched: signals.length, noiseFiltered, inserted });
      console.log(`[${name}] fetched=${signals.length} noiseFiltered=${noiseFiltered} inserted=${inserted}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      pollReport.push({ source: name, fetched: 0, noiseFiltered: 0, inserted: 0, error: message });
      console.error(`[${name}] FAILED: ${message}`);
    }
  }

  console.log("\n=== Poll report (Part 1) ===");
  console.table(pollReport);

  // Classify whatever's unclassified — a dry run has no daily cap concerns,
  // so no cap is applied here (unlike runDraftPass's CLASSIFICATION_RUN_CAP).
  const undrafted = await fetchAllUndrafted();
  const unclassified = undrafted.filter((s) => s.classifiedAsComplaint === null);
  console.log(`\nClassifying ${unclassified.length} unclassified signal(s)...`);
  const { results, stats: classificationStats } = await classifySignals(unclassified);
  await saveClassifications(
    results.map((r) => ({
      signalId: r.signalId,
      isComplaint: r.result.isComplaint,
      problemStatement: r.result.problemStatement,
      domain: r.result.domain,
      confidence: r.result.confidence,
    })),
  );

  const classificationBySignalId = new Map(results.map((r) => [r.signalId, r.result]));
  for (const signal of undrafted) {
    const c = classificationBySignalId.get(signal.id);
    if (!c) continue;
    signal.classifiedAsComplaint = c.isComplaint;
    signal.problemStatement = c.problemStatement;
    signal.domain = c.domain;
    signal.classificationConfidence = c.confidence;
  }

  const complaintCount = undrafted.filter((s) => s.classifiedAsComplaint === true).length;
  const nonComplaintCount = undrafted.filter((s) => s.classifiedAsComplaint === false).length;
  const totalClassified = complaintCount + nonComplaintCount;

  console.log("\n=== Classification report (Part 2) ===");
  console.table([
    {
      totalUndrafted: undrafted.length,
      classifiedThisRun: classificationStats.classified,
      classificationErrors: classificationStats.errors.length,
      complaints: complaintCount,
      nonComplaints: nonComplaintCount,
      complaintRatio: totalClassified > 0 ? `${((complaintCount / totalClassified) * 100).toFixed(1)}%` : "n/a",
    },
  ]);
  if (classificationStats.errors.length > 0) {
    console.log("Classification errors (first 5):", classificationStats.errors.slice(0, 5));
  }

  // Embed (real, persisted — embeddings aren't the "cluster_key persisted /
  // idea drafted" line this dry run holds back on) then cluster the
  // complaint pool WITHOUT persisting cluster_key and WITHOUT drafting.
  const complaintSignals = undrafted.filter(
    (s) => s.classifiedAsComplaint === true && (s.classificationConfidence ?? 0) >= CLASSIFICATION_CONFIDENCE_FLOOR,
  );
  const { results: embeddingResults, stats: embeddingStats } = await generateMissingEmbeddings(complaintSignals);
  await saveEmbeddings(embeddingResults);
  const embeddingBySignalId = new Map(embeddingResults.map((r) => [r.signalId, r.embedding]));
  for (const signal of complaintSignals) {
    const embedding = embeddingBySignalId.get(signal.id);
    if (embedding) signal.embedding = embedding;
  }
  console.log(`\nEmbedded ${embeddingStats.generated}/${embeddingStats.requested} complaint signal(s), $${embeddingStats.costUsd.toFixed(4)}`);

  const { clusters, stats } = clusterSignals(complaintSignals);

  const distribution: Record<string, number> = {};
  for (const c of clusters) {
    const key = c.signals.length >= 4 ? "4+" : String(c.signals.length);
    distribution[key] = (distribution[key] ?? 0) + 1;
  }

  console.log("\n=== Clustering report (Part 3) — DRY RUN, nothing persisted ===");
  console.table([
    {
      complaintSignalsConsidered: stats.signalsConsidered,
      signalsMissingEmbedding: stats.signalsMissingEmbedding,
      pairsCompared: stats.pairsCompared,
      clustersFormed: stats.clustersFormed,
      clustersPassingBar: stats.clustersPassingBar,
      threshold: stats.similarityThreshold,
    },
  ]);
  console.log("Cluster size distribution:", distribution);

  if (inspectNearMisses) inspectNearMissPairs(complaintSignals);
}

/**
 * Diagnostic only (sourced-pipeline-quality-spec.md near-miss inspection): if
 * the pass rate is stuck low, this distinguishes "scores cluster just under
 * the bar" (tune the threshold) from "scores are nowhere close" (normalization
 * isn't converging, needs a different prompt). Reuses the same pairwise
 * cosine similarity clusterSignals() computes internally, just without
 * discarding the individual scores. No threshold/clustering/prompt changes,
 * nothing persisted here.
 */
function inspectNearMissPairs(signals: RawSignal[]): void {
  const scores: number[] = [];
  const pairs: { score: number; a: RawSignal; b: RawSignal }[] = [];

  for (let i = 0; i < signals.length; i++) {
    for (let j = i + 1; j < signals.length; j++) {
      const a = signals[i];
      const b = signals[j];
      if (!a.embedding || !b.embedding) continue;
      const score = cosineSimilarity(a.embedding, b.embedding);
      scores.push(score);
      if (score < EMBEDDING_SIMILARITY_THRESHOLD) pairs.push({ score, a, b });
    }
  }

  scores.sort((x, y) => x - y);
  const pct = (p: number) => scores[Math.min(scores.length - 1, Math.floor(p * scores.length))];
  const buckets = { "<0.3": 0, "0.3-0.5": 0, "0.5-0.7": 0, "0.7-0.82": 0, ">=0.82": 0 };
  for (const s of scores) {
    if (s < 0.3) buckets["<0.3"]++;
    else if (s < 0.5) buckets["0.3-0.5"]++;
    else if (s < 0.7) buckets["0.5-0.7"]++;
    else if (s < 0.82) buckets["0.7-0.82"]++;
    else buckets[">=0.82"]++;
  }

  console.log("\n=== Near-miss inspection — DIAGNOSTIC ONLY, nothing persisted ===");
  if (scores.length === 0) {
    console.log("No pairs with both embeddings present.");
    return;
  }
  console.log(`Score distribution: n=${scores.length} min=${scores[0].toFixed(3)} p50=${pct(0.5).toFixed(3)} p90=${pct(0.9).toFixed(3)} max=${scores[scores.length - 1].toFixed(3)}`);
  console.log("Buckets:", buckets);

  console.log("\nTop 15 near-miss pairs (below threshold, descending):");
  pairs.sort((x, y) => y.score - x.score);
  for (const { score, a, b } of pairs.slice(0, 15)) {
    console.log(`\n${score.toFixed(2)} | ${a.source} vs ${b.source}`);
    console.log(`  "${(a.problemStatement ?? a.title ?? a.text).slice(0, 200)}"`);
    console.log(`  "${(b.problemStatement ?? b.title ?? b.text).slice(0, 200)}"`);
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
