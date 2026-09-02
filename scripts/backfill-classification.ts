/**
 * Backfill (sourced-pipeline-quality-spec.md Part 2): classifies every
 * existing unclassified signal in the corpus, not just newly polled ones, so
 * the first post-change clustering run has the full history normalized.
 * Reports the complaint-vs-total ratio, which is itself a key finding about
 * source quality. Never re-classifies an already-classified signal — safe to
 * re-run.
 */
import { config } from "dotenv";
config({ path: ".env.local" });
import { createClient } from "@supabase/supabase-js";
import { classifySignals } from "../lib/ingest/classification";
import { logClassifierStartup } from "../lib/llm/classifier";
import type { RawSignal } from "../lib/ingest/types";

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });

interface RawSignalRow {
  id: string;
  source: RawSignal["source"];
  title: string | null;
  text: string;
}

async function fetchUnclassified(): Promise<RawSignalRow[]> {
  const { data, error } = await sb.from("raw_signals").select("id, source, title, text").is("classified_as_complaint", null);
  if (error) throw new Error(error.message);
  return data as RawSignalRow[];
}

async function fetchTotalClassifiedCounts(): Promise<{ complaint: number; nonComplaint: number }> {
  const [complaint, nonComplaint] = await Promise.all([
    sb.from("raw_signals").select("id", { count: "exact", head: true }).eq("classified_as_complaint", true),
    sb.from("raw_signals").select("id", { count: "exact", head: true }).eq("classified_as_complaint", false),
  ]);
  if (complaint.error) throw new Error(complaint.error.message);
  if (nonComplaint.error) throw new Error(nonComplaint.error.message);
  return { complaint: complaint.count ?? 0, nonComplaint: nonComplaint.count ?? 0 };
}

async function main() {
  logClassifierStartup();
  const unclassified = await fetchUnclassified();
  console.log(`Backfilling classification for ${unclassified.length} unclassified signal(s)...`);

  const bySource: Record<string, number> = {};
  for (const s of unclassified) bySource[s.source] = (bySource[s.source] ?? 0) + 1;
  console.table(bySource);

  // No cap — this is a one-time backfill over the full corpus, not a
  // recurring pass, so CLASSIFICATION_RUN_CAP doesn't apply.
  const { results, stats } = await classifySignals(unclassified);

  for (const r of results) {
    const { error } = await sb
      .from("raw_signals")
      .update({
        classified_as_complaint: r.result.isComplaint,
        problem_statement: r.result.problemStatement,
        domain: r.result.domain,
        classification_confidence: r.result.confidence,
        classified_at: new Date().toISOString(),
      })
      .eq("id", r.signalId);
    if (error) console.error(`[backfill] save failed for ${r.signalId}:`, error.message);
  }

  console.log(`\nClassified ${stats.classified}/${stats.requested}. Errors: ${stats.errors.length}. Cost: $${stats.costUsd.toFixed(4)}`);
  if (stats.errors.length > 0) console.log("Errors (first 10):", stats.errors.slice(0, 10));

  const totals = await fetchTotalClassifiedCounts();
  const total = totals.complaint + totals.nonComplaint;
  console.log("\n=== Corpus-wide complaint ratio (key finding on source quality) ===");
  console.table([
    {
      complaint: totals.complaint,
      nonComplaint: totals.nonComplaint,
      ratio: total > 0 ? `${((totals.complaint / total) * 100).toFixed(1)}%` : "n/a",
    },
  ]);
}
main().catch((e) => { console.error(e); process.exit(1); });
