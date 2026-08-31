import type { TriangulationStats } from "@/types/idea-drop";

/**
 * "{n} signals · {m} platforms · {d} days" — omit the whole badge rather than
 * show a zero or a placeholder. Single- vs multi-platform evidence gets a
 * distinct modifier class (sourced-pipeline-quality-spec.md Part 4: since the
 * clustering/publish gate now accepts single-platform evidence, cross-platform
 * spread is a tracked quality signal, not a requirement — it should read as
 * visibly stronger, not identical).
 */
export default function TriangulationBadge({ stats }: { stats: TriangulationStats | undefined }) {
  if (!stats) return null;

  const crossPlatform = stats.platformCount >= 2;

  return (
    <span className={`triangulation-badge mono ${crossPlatform ? "is-cross-platform" : "is-single-platform"}`}>
      {stats.signalCount} signal{stats.signalCount === 1 ? "" : "s"} · {stats.platformCount} platform
      {stats.platformCount === 1 ? "" : "s"} · {stats.daySpan} day{stats.daySpan === 1 ? "" : "s"}
    </span>
  );
}
