import type { TriangulationStats } from "@/types/idea-drop";

/** "{n} signals · {m} platforms · {d} days" — omit the whole badge rather than show a zero or a placeholder. */
export default function TriangulationBadge({ stats }: { stats: TriangulationStats | undefined }) {
  if (!stats) return null;

  return (
    <span className="triangulation-badge mono">
      {stats.signalCount} signal{stats.signalCount === 1 ? "" : "s"} · {stats.platformCount} platform
      {stats.platformCount === 1 ? "" : "s"} · {stats.daySpan} day{stats.daySpan === 1 ? "" : "s"}
    </span>
  );
}
