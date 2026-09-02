/**
 * pgvector migration Phase B (pgvector-migration-spec.md): casts every
 * raw_signals.embedding (jsonb) row to embedding_vec (vector(1536)) via the
 * backfill_embedding_vec_batch RPC (migration 0022), so the whole batch is
 * cast server-side rather than round-tripping 1536 floats per row through
 * Node. Batches of 500 ids, sequential, catch-and-log per-batch errors.
 *
 * Run once, after 0022 and before the 0023 HNSW index migration.
 */
import { config } from "dotenv";
config({ path: ".env.local" });
import { createClient } from "@supabase/supabase-js";

const BATCH_SIZE = 500;

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false },
  });

  const { data, error } = await sb
    .from("raw_signals")
    .select("id")
    .not("embedding", "is", null)
    .is("embedding_vec", null);
  if (error) throw new Error(`fetch pending rows: ${error.message}`);

  const ids = (data as { id: string }[]).map((r) => r.id);
  console.log(`${ids.length} rows have embedding but no embedding_vec.`);

  if (dryRun) {
    console.log("--dry-run: exiting without writing.");
    return;
  }

  let updated = 0;
  const errors: string[] = [];
  const startedAt = Date.now();

  for (let i = 0; i < ids.length; i += BATCH_SIZE) {
    const batch = ids.slice(i, i + BATCH_SIZE);
    const { data: result, error: rpcError } = await sb.rpc("backfill_embedding_vec_batch", { p_ids: batch });
    if (rpcError) {
      const msg = `batch ${i}-${i + batch.length}: ${rpcError.message}`;
      console.error(msg);
      errors.push(msg);
      continue;
    }
    const count = (result as { id: string }[] | null)?.length ?? 0;
    updated += count;
    console.log(`Batch ${i / BATCH_SIZE + 1}: cast ${count}/${batch.length} rows. Running total: ${updated}/${ids.length}`);
  }

  const durationMs = Date.now() - startedAt;
  console.log(`Done. Cast ${updated}/${ids.length} rows in ${durationMs}ms. Errors: ${errors.length}`);

  // pipeline_runs has no generic "kind" column (spec's non-goal: don't
  // change that schema) — log this one-off backfill as an informational
  // errors-array entry rather than fabricating stats columns for it. Insert
  // directly (not via lib/ingest/pipeline-runs-repository.ts, which imports
  // "server-only" and can't run under a plain tsx script).
  const { error: logError } = await sb.from("pipeline_runs").insert({
    signals_considered: ids.length,
    pairs_compared: 0,
    clusters_formed: 0,
    clusters_passing_bar: 0,
    drafted: 0,
    similarity_threshold: 0,
    min_cluster_size: 0,
    min_cluster_platforms: 0,
    errors: [`backfill_embeddings_vec: cast ${updated}/${ids.length} rows in ${durationMs}ms`, ...errors],
  });
  if (logError) console.error("[pipeline_runs] insert failed:", logError.message);

  if (errors.length > 0) process.exitCode = 1;
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
