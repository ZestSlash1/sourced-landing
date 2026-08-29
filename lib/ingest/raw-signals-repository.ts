import "server-only";
import { getSupabaseServerClient } from "@/lib/supabase/server";
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
