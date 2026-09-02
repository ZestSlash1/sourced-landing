import "server-only";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { parseEmbeddingField } from "./embeddings";
import type { RawSignal, RawSignalInput } from "./types";

const TABLE = "raw_signals";

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
  // pgvector's text output over PostgREST ("[0.1,0.2,...]"), not a native
  // JSON array — see parseEmbeddingField and pgvector-migration-spec.md Phase F.
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

/**
 * Writes a poller's candidates, deduped on url (A1) — an insert that
 * collides with an existing url is silently ignored rather than erroring,
 * since re-polling the same post/issue/question is expected on every run.
 * Returns how many were actually new.
 */
export async function insertRawSignals(signals: RawSignalInput[]): Promise<number> {
  if (signals.length === 0) return 0;

  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from(TABLE)
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

  if (error) throw new Error(`insertRawSignals: ${error.message}`);
  return (data as { id: string }[]).length;
}

export interface SignalSummary {
  id: string;
  source: RawSignal["source"];
  title: string | null;
  postedAt: string | null;
  clusterKey: string | null;
  classifiedAsComplaint: boolean | null;
  domain: string | null;
}

/**
 * Every signal's id/source/title/postedAt/clusterKey/classification —
 * nothing else. This is the projection the public transparency pages
 * (/methodology, /rejected) are built on; it deliberately omits text, url,
 * and embedding so a rejected cluster's full complaint text or source link
 * can never leak onto a public page just by widening a `select("*")`
 * upstream. problem_statement is likewise omitted even though it's shorter
 * than raw text — it's still the author's material paraphrased, not ours to
 * publish without the surrounding evidence review a drafted idea gets.
 */
export async function listAllSignalSummaries(): Promise<SignalSummary[]> {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from(TABLE)
    .select("id, source, title, posted_at, cluster_key, classified_as_complaint, domain");

  if (error) throw new Error(`listAllSignalSummaries: ${error.message}`);
  return (
    data as {
      id: string;
      source: RawSignal["source"];
      title: string | null;
      posted_at: string | null;
      cluster_key: string | null;
      classified_as_complaint: boolean | null;
      domain: string | null;
    }[]
  ).map((r) => ({
    id: r.id,
    source: r.source,
    title: r.title,
    postedAt: r.posted_at,
    clusterKey: r.cluster_key,
    classifiedAsComplaint: r.classified_as_complaint,
    domain: r.domain,
  }));
}

export interface PublicSignal {
  id: string;
  source: RawSignal["source"];
  url: string;
  title: string | null;
  postedAt: string | null;
  classifiedAsComplaint: boolean | null;
}

/**
 * One page of signals for the public `/signals` firehose, newest-posted
 * first, including the source `url` — unlike listAllSignalSummaries, this is
 * meant to link out to the original post, so it's a narrower-but-different
 * projection (url in, cluster_key/domain out) rather than a widened reuse of
 * that function.
 */
export async function listSignalsPage(
  page: number,
  pageSize: number,
): Promise<{ signals: PublicSignal[]; total: number }> {
  const supabase = getSupabaseServerClient();
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const { data, error, count } = await supabase
    .from(TABLE)
    .select("id, source, url, title, posted_at, classified_as_complaint", { count: "exact" })
    .order("posted_at", { ascending: false, nullsFirst: false })
    .range(from, to);

  if (error) throw new Error(`listSignalsPage: ${error.message}`);

  const rows = data as {
    id: string;
    source: RawSignal["source"];
    url: string;
    title: string | null;
    posted_at: string | null;
    classified_as_complaint: boolean | null;
  }[];

  return {
    signals: rows.map((r) => ({
      id: r.id,
      source: r.source,
      url: r.url,
      title: r.title,
      postedAt: r.posted_at,
      classifiedAsComplaint: r.classified_as_complaint,
    })),
    total: count ?? 0,
  };
}

/** Undrafted signals with no classification yet — classification's input pool. Never re-selects an already-classified signal. */
export async function listUnclassifiedSignals(): Promise<RawSignal[]> {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from(TABLE)
    .select("*")
    .is("drafted_idea_id", null)
    .is("classified_as_complaint", null)
    .order("fetched_at", { ascending: false });

  if (error) throw new Error(`listUnclassifiedSignals: ${error.message}`);
  return (data as RawSignalRow[]).map(rowToSignal);
}

/**
 * Persists classification results (Part 2) — one update per signal, same
 * shape as saveEmbeddings. classified_at is stamped so "never re-classify an
 * already-classified signal" is auditable, not just implied by the null
 * check the caller's query already does.
 */
export async function saveClassifications(
  updates: { signalId: string; isComplaint: boolean; problemStatement: string | null; domain: string | null; confidence: number }[],
): Promise<void> {
  if (updates.length === 0) return;

  const supabase = getSupabaseServerClient();
  for (const u of updates) {
    const { error } = await supabase
      .from(TABLE)
      .update({
        classified_as_complaint: u.isComplaint,
        problem_statement: u.problemStatement,
        domain: u.domain,
        classification_confidence: u.confidence,
        classified_at: new Date().toISOString(),
      })
      .eq("id", u.signalId);
    if (error) throw new Error(`saveClassifications: ${error.message}`);
  }
}

/**
 * The raw signals behind a set of ids, in no particular order — the join
 * source_signal_ids relies on for public evidence (triangulation badge,
 * source links). Ids with no matching row (a signal deleted after the idea
 * was drafted) are silently absent from the result rather than erroring.
 */
export async function listSignalsByIds(ids: string[]): Promise<RawSignal[]> {
  if (ids.length === 0) return [];

  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase.from(TABLE).select("*").in("id", ids);

  if (error) throw new Error(`listSignalsByIds: ${error.message}`);
  return (data as RawSignalRow[]).map(rowToSignal);
}

/** Signals not yet folded into a draft, newest first — clustering's input pool. */
export async function listUndraftedSignals(): Promise<RawSignal[]> {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from(TABLE)
    .select("*")
    .is("drafted_idea_id", null)
    .order("fetched_at", { ascending: false });

  if (error) throw new Error(`listUndraftedSignals: ${error.message}`);
  return (data as RawSignalRow[]).map(rowToSignal);
}

/**
 * Persists the cluster_key produced by A2. Written for every clustered
 * signal (singletons included) so a later query can inspect the actual
 * grouping — the previous pipeline computed clusters in memory and threw
 * them away, which made "no clusters ever formed" indistinguishable from
 * "clusters formed but were filtered out". Skips writes when the stored
 * key already matches, to avoid churning updated_at unnecessarily.
 */
export async function persistClusterKeys(assignments: { signalId: string; clusterKey: string }[]): Promise<number> {
  if (assignments.length === 0) return 0;

  const supabase = getSupabaseServerClient();
  const byKey = new Map<string, string[]>();
  for (const { signalId, clusterKey } of assignments) {
    const arr = byKey.get(clusterKey) ?? [];
    arr.push(signalId);
    byKey.set(clusterKey, arr);
  }

  let written = 0;
  for (const [clusterKey, ids] of Array.from(byKey.entries())) {
    const { error, count } = await supabase
      .from(TABLE)
      .update({ cluster_key: clusterKey }, { count: "exact" })
      .in("id", ids)
      .or(`cluster_key.is.null,cluster_key.neq.${clusterKey}`);
    if (error) throw new Error(`persistClusterKeys: ${error.message}`);
    written += count ?? 0;
  }
  return written;
}

/**
 * Persists embeddings generated by the A2 pre-clustering step. Batched one
 * update per signal (no bulk-upsert-by-id in PostgREST for heterogeneous
 * values), but this only ever runs over the handful of signals missing an
 * embedding on a given pass, not the whole pool.
 *
 * Post-Phase-F (pgvector-migration-spec.md), `embedding` is the pgvector
 * column directly (the jsonb column and its dual-write are gone). Still
 * goes through set_signal_embedding_vec rather than a plain .update(), since
 * supabase-js can't round-trip the vector wire format through a plain
 * .update() call — the cast happens in Postgres from the vector's text
 * literal instead.
 */
export async function saveEmbeddings(updates: { signalId: string; embedding: number[] }[]): Promise<void> {
  if (updates.length === 0) return;

  const supabase = getSupabaseServerClient();
  for (const { signalId, embedding } of updates) {
    const { error } = await supabase.rpc("set_signal_embedding_vec", {
      p_id: signalId,
      p_vec: `[${embedding.join(",")}]`,
    });
    if (error) throw new Error(`saveEmbeddings: ${error.message}`);
  }
}

/** Marks a set of signals as consumed by a draft (A3), so they're never redrafted. */
export async function markSignalsDrafted(signalIds: string[], ideaId: string): Promise<void> {
  if (signalIds.length === 0) return;

  const supabase = getSupabaseServerClient();
  const { error } = await supabase
    .from(TABLE)
    .update({ drafted_idea_id: ideaId })
    .in("id", signalIds);

  if (error) throw new Error(`markSignalsDrafted: ${error.message}`);
}
