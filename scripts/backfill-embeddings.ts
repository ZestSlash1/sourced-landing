/**
 * Generates embeddings for raw_signals complaint rows missing one,
 * using local Ollama (nomic-embed-text, 768 dimensions) at $0 cost.
 */
import { config } from "dotenv";
config({ path: ".env.local" });
import { createClient } from "@supabase/supabase-js";
import { generateMissingEmbeddings, parseEmbeddingField } from "../lib/ingest/embeddings";
import type { RawSignal } from "../lib/ingest/types";

async function main() {
  const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false },
  });

  const { data, error } = await sb
    .from("raw_signals")
    .select("*")
    .eq("classified_as_complaint", true)
    .range(0, 5000)
    .order("fetched_at", { ascending: false });

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
    embedding: parseEmbeddingField(r.embedding),
    classifiedAsComplaint: (r.classified_as_complaint as boolean | null) ?? null,
    problemStatement: (r.problem_statement as string | null) ?? null,
    domain: (r.domain as string | null) ?? null,
    classificationConfidence: (r.classification_confidence as number | null) ?? null,
  }));

  const missing = signals.filter((s) => !s.embedding);
  console.log(`Loaded ${signals.length} complaint signals (${missing.length} missing embeddings).`);

  if (missing.length === 0) {
    console.log("All complaint signals already have embeddings.");
    return;
  }

  const { results, stats } = await generateMissingEmbeddings(signals);
  console.log(
    `Requested: ${stats.requested}  Generated: ${stats.generated}  Provider: ${stats.provider ?? "unknown"}  Est. cost: $${stats.costUsd.toFixed(4)}`,
  );
  if (stats.errors.length > 0) {
    console.log(`Errors (${stats.errors.length}):`);
    for (const e of stats.errors) console.log(`  ${e}`);
  }

  console.log(`Saving ${results.length} embeddings to database...`);
  const CHUNK_SIZE = 25;
  for (let i = 0; i < results.length; i += CHUNK_SIZE) {
    const chunk = results.slice(i, i + CHUNK_SIZE);
    await Promise.all(
      chunk.map(async ({ signalId, embedding }) => {
        const { error: updateError } = await sb.rpc("set_signal_embedding_vec", {
          p_id: signalId,
          p_vec: `[${embedding.join(",")}]`,
        });
        if (updateError) throw new Error(`Failed to save embedding for ${signalId}: ${updateError.message}`);
      }),
    );
    process.stdout.write(`Saved ${Math.min(i + CHUNK_SIZE, results.length)}/${results.length}\r`);
  }

  console.log(`\nSuccessfully saved ${results.length} embeddings.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
