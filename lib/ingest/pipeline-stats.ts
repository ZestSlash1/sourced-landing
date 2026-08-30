import "server-only";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { truncate } from "@/lib/seo";
import { MIN_CLUSTER_SIZE, MIN_CLUSTER_PLATFORMS } from "./clustering";
import { listAllSignalSummaries, type SignalSummary } from "./raw-signals-repository";
import { STOPWORDS } from "./stopwords";

interface ClusterGroup {
  clusterKey: string;
  signals: SignalSummary[];
  platforms: string[];
  signalCount: number;
  platformCount: number;
  passesBar: boolean;
  minPostedAt: string | null;
  maxPostedAt: string | null;
}

/** Groups signals by cluster_key (nulls excluded — those are unclustered singletons, not a cluster). */
function groupByCluster(signals: SignalSummary[]): ClusterGroup[] {
  const byKey = new Map<string, SignalSummary[]>();
  for (const s of signals) {
    if (!s.clusterKey) continue;
    const group = byKey.get(s.clusterKey) ?? [];
    group.push(s);
    byKey.set(s.clusterKey, group);
  }

  return Array.from(byKey.entries()).map(([clusterKey, group]) => {
    const platforms = Array.from(new Set(group.map((s) => s.source)));
    const postedDates = group
      .map((s) => s.postedAt)
      .filter((d): d is string => d !== null)
      .sort();

    return {
      clusterKey,
      signals: group,
      platforms,
      signalCount: group.length,
      platformCount: platforms.length,
      passesBar: group.length >= MIN_CLUSTER_SIZE && platforms.length >= MIN_CLUSTER_PLATFORMS,
      minPostedAt: postedDates[0] ?? null,
      maxPostedAt: postedDates[postedDates.length - 1] ?? null,
    };
  });
}

export interface MethodologyStats {
  signalsIngested: number;
  sourcesActive: number;
  clustersFormed: number;
  clustersPassingBar: number;
  briefsPublished: number;
}

async function countPublishedBriefs(): Promise<number> {
  const supabase = getSupabaseServerClient();
  const { count, error } = await supabase
    .from("idea_drops")
    .select("id", { count: "exact", head: true })
    .eq("status", "published");

  if (error) throw new Error(`countPublishedBriefs: ${error.message}`);
  return count ?? 0;
}

/**
 * The "Live numbers" panel on /methodology — every figure derived from the
 * database on each request, never cached or hardcoded. A 0 here is shown
 * honestly (the page's whole point is transparency), not hidden.
 */
export async function getMethodologyStats(): Promise<MethodologyStats> {
  const [signals, briefsPublished] = await Promise.all([listAllSignalSummaries(), countPublishedBriefs()]);
  const groups = groupByCluster(signals);

  return {
    signalsIngested: signals.length,
    sourcesActive: new Set(signals.map((s) => s.source)).size,
    clustersFormed: groups.length,
    clustersPassingBar: groups.filter((g) => g.passesBar).length,
    briefsPublished,
  };
}

export interface RejectedCluster {
  clusterKey: string;
  theme: string;
  signalCount: number;
  platformCount: number;
  platforms: string[];
  minPostedAt: string | null;
  maxPostedAt: string | null;
}

/**
 * A short label for a cluster from its signal titles, without calling an
 * LLM: words that recur across more than one of the cluster's titles, most
 * frequent first. Falls back to the first signal's title (truncated) when
 * nothing repeats — common for a 2-signal cluster, since two titles rarely
 * share a non-stopword word by chance.
 */
function deriveTheme(titles: string[]): string {
  const nonEmpty = titles.map((t) => t.trim()).filter((t) => t.length > 0);
  if (nonEmpty.length === 0) return "Untitled cluster";

  const freq = new Map<string, number>();
  for (const title of nonEmpty) {
    const words = title.toLowerCase().match(/[a-z][a-z'-]{2,}/g) ?? [];
    const seenInThisTitle = new Set<string>();
    for (const w of words) {
      if (STOPWORDS.has(w) || seenInThisTitle.has(w)) continue;
      seenInThisTitle.add(w);
      freq.set(w, (freq.get(w) ?? 0) + 1);
    }
  }

  const recurring = Array.from(freq.entries())
    .filter(([, count]) => count > 1)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([word]) => word[0].toUpperCase() + word.slice(1));

  if (recurring.length === 0) return truncate(nonEmpty[0], 70);
  return recurring.join(" · ");
}

/**
 * Every cluster that formed but did not clear the 3-signals / 2-platforms
 * bar, newest first (by the cluster's most recent signal). Powers the
 * public /rejected page — deliberately returns only the theme, counts,
 * platform names, and date range; callers must not add source links, raw
 * titles/text, or embedding data to this shape.
 */
export async function listRejectedClusters(): Promise<RejectedCluster[]> {
  const signals = await listAllSignalSummaries();
  const groups = groupByCluster(signals).filter((g) => !g.passesBar);

  return groups
    .map((g) => ({
      clusterKey: g.clusterKey,
      theme: deriveTheme(g.signals.map((s) => s.title ?? "")),
      signalCount: g.signalCount,
      platformCount: g.platformCount,
      platforms: g.platforms,
      minPostedAt: g.minPostedAt,
      maxPostedAt: g.maxPostedAt,
    }))
    .sort((a, b) => (b.maxPostedAt ?? "").localeCompare(a.maxPostedAt ?? ""));
}
