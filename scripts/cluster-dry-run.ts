/**
 * Runs the clustering step over the existing raw_signals pool, prints the
 * cluster size distribution plus cross-platform detail, and (with --write)
 * persists cluster_key back to the DB. Does NOT call the LLM or write
 * idea_drops. Does NOT generate embeddings — run
 * `npx tsx scripts/backfill-embeddings.ts` first, or this will report every
 * signal as missing an embedding and every cluster as a singleton.
 *
 * Flags:
 *   --write               persist cluster_key for non-singleton clusters
 *   --threshold=0.75      override EMBEDDING_SIMILARITY_THRESHOLD for this run
 *   --strategy=jaccard     use the legacy word-overlap clustering instead
 */
import { config } from "dotenv";
config({ path: ".env.local" });
import { createClient } from "@supabase/supabase-js";
import {
  clusterSignals,
  EMBEDDING_SIMILARITY_THRESHOLD,
  JACCARD_SIMILARITY_THRESHOLD,
  MIN_CLUSTER_SIZE,
  MIN_CLUSTER_PLATFORMS,
  type ClusteringStrategy,
} from "../lib/ingest/clustering";
import type { RawSignal } from "../lib/ingest/types";

const write = process.argv.includes("--write");
const thresholdArg = process.argv.find((a) => a.startsWith("--threshold="));
const strategyArg = process.argv.find((a) => a.startsWith("--strategy="));
const strategy: ClusteringStrategy = strategyArg?.split("=")[1] === "jaccard" ? "jaccard" : "embedding";
const threshold = thresholdArg
  ? Number(thresholdArg.split("=")[1])
  : strategy === "jaccard"
    ? JACCARD_SIMILARITY_THRESHOLD
    : EMBEDDING_SIMILARITY_THRESHOLD;

async function main() {
  const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });
  const { data, error } = await sb
    .from("raw_signals")
    .select("*")
    .is("drafted_idea_id", null)
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
    embedding: (r.embedding as number[] | null) ?? null,
  }));

  const { clusters, stats } = clusterSignals(signals, { strategy, threshold });

  const sizeDist = new Map<number, number>();
  for (const c of clusters) sizeDist.set(c.signals.length, (sizeDist.get(c.signals.length) ?? 0) + 1);

  console.log("Strategy:", strategy, "Threshold:", threshold, "min size:", MIN_CLUSTER_SIZE, "min platforms:", MIN_CLUSTER_PLATFORMS);
  console.log("Stats:", stats);
  console.log("Cluster size distribution (size -> #clusters):");
  for (const [size, n] of Array.from(sizeDist.entries()).sort((a, b) => a[0] - b[0])) {
    console.log(`  size ${size}: ${n}`);
  }

  const nonSingletons = clusters.filter((c) => c.signals.length > 1);
  const clusteredSignalCount = nonSingletons.reduce((n, c) => n + c.signals.length, 0);
  console.log(`Non-singleton clusters: ${nonSingletons.length} covering ${clusteredSignalCount} signals`);

  const crossPlatform = nonSingletons.filter((c) => c.crossPlatform);
  console.log(`Cross-platform clusters (2+ sources): ${crossPlatform.length}`);

  const passing = clusters.filter((c) => c.passesBar);
  const passingSinglePlatform = passing.filter((c) => !c.crossPlatform);
  const passingMultiPlatform = passing.filter((c) => c.crossPlatform);
  console.log(
    `Passing ${MIN_CLUSTER_SIZE}+/${MIN_CLUSTER_PLATFORMS}+ bar: ${passing.length} ` +
      `(single-platform: ${passingSinglePlatform.length}, multi-platform: ${passingMultiPlatform.length})`,
  );

  function describe(c: (typeof clusters)[number]) {
    const platforms = Array.from(new Set(c.signals.map((s) => s.source)));
    console.log(`\n  key=${c.key.slice(0, 8)} size=${c.signals.length} platforms=[${platforms.join(",")}]`);
    for (const s of c.signals) console.log(`    [${s.source}] ${(s.title ?? s.text).slice(0, 100)}`);
  }

  console.log(`\n=== Passing clusters (${MIN_CLUSTER_SIZE}+/${MIN_CLUSTER_PLATFORMS}+) ===`);
  passing.forEach(describe);

  console.log("\n=== Near-misses (non-singleton, not passing) ===");
  nonSingletons.filter((c) => !c.passesBar).forEach(describe);

  if (write) {
    const byKey = new Map<string, string[]>();
    for (const c of nonSingletons) {
      byKey.set(c.key, c.signals.map((s) => s.id));
    }
    let written = 0;
    for (const [key, ids] of Array.from(byKey.entries())) {
      const { error: e, count } = await sb.from("raw_signals").update({ cluster_key: key }, { count: "exact" }).in("id", ids);
      if (e) throw e;
      written += count ?? 0;
    }
    console.log(`\nWrote cluster_key to ${written} rows.`);
  } else {
    console.log("\n(dry run; pass --write to persist cluster_key)");
  }
}
main().catch((e) => { console.error(e); process.exit(1); });
