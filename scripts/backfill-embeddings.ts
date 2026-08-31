/**
 * One-time backfill: generates embeddings for every raw_signals row missing
 * one, via OpenRouter's openai/text-embedding-3-small proxy. Same code path
 * as the pipeline's incremental embedding step (lib/ingest/embeddings.ts) —
 * this just runs it over the whole undrafted pool instead of one pass'
 * worth of new signals.
 */
import { config } from "dotenv";
config({ path: ".env.local" });
import { createClient } from "@supabase/supabase-js";
import { generateMissingEmbeddings } from "../lib/ingest/embeddings";
import type { RawSignal } from "../lib/ingest/types";

async function main() {
  const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });
  const { data, error } = await sb.from("raw_signals").select("*").order("fetched_at", { ascending: false });
  if (error) throw error;

  const signals: RawSignal[] = (data ?? []).map((r: Record<string, unknown>) => ({
    id: r.id as string,
    source: r.source as RawSignal["source"],
    url: r.url as string,
    title: r.title as string | null,
    text: r.text as string,
    author: r.author as string | null,
    engagementMetric: r.engagement_metric as number,
    postedAt: r.posted_at as string | null,
    fetchedAt: r.fetched_at as string,
    clusterKey: r.cluster_key as string | null,
    draftedIdeaId: r.drafted_idea_id as string | null,
    embedding: (r.embedding as number[] | null) ?? null,
    classifiedAsComplaint: (r.classified_as_complaint as boolean | null) ?? null,
    problemStatement: (r.problem_statement as string | null) ?? null,
    domain: (r.domain as string | null) ?? null,
    classificationConfidence: (r.classification_confidence as number | null) ?? null,
  }));

  console.log(`Loaded ${signals.length} signals, ${signals.filter((s) => !s.embedding).length} missing embeddings.`);

  const { results, stats } = await generateMissingEmbeddings(signals);
  console.log(`Requested: ${stats.requested}  Generated: ${stats.generated}  Est. cost: $${stats.costUsd.toFixed(4)}`);
  if (stats.errors.length > 0) {
    console.log(`Errors (${stats.errors.length}):`);
    for (const e of stats.errors) console.log(`  ${e}`);
  }

  for (const { signalId, embedding } of results) {
    const { error: updateError } = await sb.from("raw_signals").update({ embedding }).eq("id", signalId);
    if (updateError) throw new Error(`Failed to save embedding for ${signalId}: ${updateError.message}`);
  }
  console.log(`Saved ${results.length} embeddings.`);
}
main().catch((e) => { console.error(e); process.exit(1); });
