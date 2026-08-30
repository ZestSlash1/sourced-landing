import "server-only";
import { listSignalsByIds } from "@/lib/ingest/raw-signals-repository";
import type { RawSignal } from "@/lib/ingest/types";
import type { SourceLink, TriangulationStats } from "@/types/idea-drop";

export interface Triangulation {
  stats: TriangulationStats;
  sources: SourceLink[];
}

const MS_PER_DAY = 86_400_000;

function computeTriangulation(signals: RawSignal[]): Triangulation {
  const platforms = new Set(signals.map((s) => s.source));
  const postedTimes = signals
    .map((s) => s.postedAt)
    .filter((d): d is string => d !== null)
    .map((d) => new Date(d).getTime());
  const daySpan =
    postedTimes.length > 0 ? Math.round((Math.max(...postedTimes) - Math.min(...postedTimes)) / MS_PER_DAY) : 0;

  return {
    stats: { signalCount: signals.length, platformCount: platforms.size, daySpan },
    sources: signals
      .slice()
      .sort((a, b) => (b.postedAt ?? "").localeCompare(a.postedAt ?? ""))
      .map((s) => ({ source: s.source, url: s.url, title: s.title, postedAt: s.postedAt })),
  };
}

/**
 * The public triangulation badge + source link list for one idea, derived
 * live from source_signal_ids joined against raw_signals. Returns null
 * (never zeros or placeholders) when there's nothing to show — an empty or
 * null source_signal_ids, or a join that matches no rows (every id orphaned).
 */
export async function getTriangulation(sourceSignalIds: string[] | undefined): Promise<Triangulation | null> {
  if (!sourceSignalIds || sourceSignalIds.length === 0) return null;

  const signals = await listSignalsByIds(sourceSignalIds);
  if (signals.length === 0) return null;

  return computeTriangulation(signals);
}

/**
 * Batch variant for list views — one raw_signals query across every idea's
 * ids instead of one per card. Ideas with nothing to show are simply absent
 * from the returned map.
 */
export async function getTriangulationMap(
  ideas: { id: string; sourceSignalIds?: string[] }[],
): Promise<Map<string, Triangulation>> {
  const allIds = Array.from(new Set(ideas.flatMap((i) => i.sourceSignalIds ?? [])));
  const result = new Map<string, Triangulation>();
  if (allIds.length === 0) return result;

  const signals = await listSignalsByIds(allIds);
  const byId = new Map(signals.map((s) => [s.id, s]));

  for (const idea of ideas) {
    const ideaSignals = (idea.sourceSignalIds ?? [])
      .map((id) => byId.get(id))
      .filter((s): s is RawSignal => s !== undefined);
    if (ideaSignals.length === 0) continue;
    result.set(idea.id, computeTriangulation(ideaSignals));
  }

  return result;
}
