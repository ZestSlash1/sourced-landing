/**
 * pgvector migration Phase E (pgvector-migration-spec.md). Picks 20 random
 * clustered signals, computes cosine similarity against every other signal
 * two ways — the old in-process JS loop (embeddings.ts#cosineSimilarity
 * over the jsonb embedding) and the new SQL path (find_signal_neighbors RPC
 * over embedding_vec, migration 0022) — and asserts they agree within
 * 0.0001. STOP and investigate before Phase F if this fails.
 */
import { config } from "dotenv";
config({ path: ".env.local" });
import { createClient } from "@supabase/supabase-js";
import { cosineSimilarity } from "../lib/ingest/embeddings";

const SAMPLE_SIZE = 20;
const TOLERANCE = 0.0001;

interface Row {
  id: string;
  embedding: number[] | null;
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

async function main() {
  const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false },
  });

  const { data: allSignals, error } = await sb
    .from("raw_signals")
    .select("id, embedding")
    .not("embedding", "is", null);
  if (error) throw new Error(`fetch signals: ${error.message}`);
  const signals = allSignals as Row[];
  const embeddingById = new Map(signals.map((s) => [s.id, s.embedding!]));

  const { data: clustered, error: clusteredError } = await sb
    .from("raw_signals")
    .select("id")
    .not("cluster_key", "is", null);
  if (clusteredError) throw new Error(`fetch clustered signals: ${clusteredError.message}`);

  const pool = (clustered as { id: string }[]).filter((s) => embeddingById.has(s.id));
  if (pool.length === 0) throw new Error("No clustered signals with an embedding to sample from.");

  const sample = shuffle(pool).slice(0, Math.min(SAMPLE_SIZE, pool.length));
  console.log(`Sampling ${sample.length} clustered signals against ${signals.length} total signals.`);

  let pairsChecked = 0;
  let maxDelta = 0;
  const failures: string[] = [];

  for (const { id } of sample) {
    const jsEmbedding = embeddingById.get(id)!;
    const { data: neighbors, error: rpcError } = await sb.rpc("find_signal_neighbors", {
      p_signal_id: id,
      p_k: signals.length,
    });
    if (rpcError) {
      failures.push(`${id}: RPC error: ${rpcError.message}`);
      continue;
    }
    for (const row of (neighbors as { id: string; similarity: number }[]) ?? []) {
      const otherEmbedding = embeddingById.get(row.id);
      if (!otherEmbedding) continue; // no jsonb embedding to compare against (shouldn't happen mid-migration)
      const jsSimilarity = cosineSimilarity(jsEmbedding, otherEmbedding);
      const delta = Math.abs(jsSimilarity - row.similarity);
      pairsChecked++;
      maxDelta = Math.max(maxDelta, delta);
      if (delta >= TOLERANCE) {
        failures.push(`${id} <-> ${row.id}: js=${jsSimilarity.toFixed(6)} sql=${row.similarity.toFixed(6)} delta=${delta.toFixed(6)}`);
      }
    }
  }

  const passed = failures.length === 0;
  console.log(`Checked ${pairsChecked} pairs. Max delta: ${maxDelta.toFixed(8)}. Tolerance: ${TOLERANCE}.`);
  console.log(passed ? "PASS — parity holds. Safe to proceed to Phase F." : `FAIL — ${failures.length} pairs exceeded tolerance. STOP before Phase F.`);
  if (!passed) {
    for (const f of failures.slice(0, 20)) console.log(`  ${f}`);
  }

  const { error: logError } = await sb.from("pipeline_runs").insert({
    signals_considered: signals.length,
    pairs_compared: pairsChecked,
    clusters_formed: 0,
    clusters_passing_bar: 0,
    drafted: 0,
    similarity_threshold: 0,
    min_cluster_size: 0,
    min_cluster_platforms: 0,
    errors: [
      `verify_embedding_parity: ${passed ? "PASS" : "FAIL"} — sampled ${sample.length} signals, checked ${pairsChecked} pairs, max delta ${maxDelta.toFixed(8)}`,
      ...failures,
    ],
  });
  if (logError) console.error("[pipeline_runs] insert failed:", logError.message);

  if (!passed) process.exitCode = 1;
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
