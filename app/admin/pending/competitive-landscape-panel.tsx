"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { CompetitiveLandscape } from "@/types/idea-drop";

const VERDICT_LABEL: Record<CompetitiveLandscape["verdict"], string> = {
  no_direct_competitor: "No direct competitor found",
  partial_overlap: "Partial overlap",
  close_competitor_exists: "Close competitor exists",
};

const VERDICT_COLOR: Record<CompetitiveLandscape["verdict"], string> = {
  no_direct_competitor: "var(--violet-deep)",
  partial_overlap: "#B8860B",
  close_competitor_exists: "#C4432F",
};

/**
 * Admin-facing surfacing of the competitive gap check (Part A4 companion —
 * sourced-competitive-gap-spec.md "Admin review surfacing"). Advisory only:
 * a close_competitor_exists verdict doesn't block the Approve button here,
 * it's just shown so the admin makes the call explicitly.
 */
export default function CompetitiveLandscapePanel({
  ideaId,
  landscape,
}: {
  ideaId: string;
  landscape: CompetitiveLandscape | null | undefined;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function recheck() {
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/admin/ideas/${ideaId}/recheck-competitive`, { method: "POST" });
    setBusy(false);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? `Re-check failed (${res.status})`);
      return;
    }
    router.refresh();
  }

  return (
    <div style={{ marginBottom: 16 }}>
      <p style={{ fontSize: 12, color: "var(--ink-soft)", margin: "0 0 6px" }}>Competitive landscape:</p>

      {landscape ? (
        <div
          style={{
            border: "1px solid var(--line)",
            borderRadius: "var(--r-sm)",
            padding: "10px 12px",
            marginBottom: 8,
          }}
        >
          <p style={{ margin: "0 0 6px", fontSize: 13, fontWeight: 600, color: VERDICT_COLOR[landscape.verdict] }}>
            {VERDICT_LABEL[landscape.verdict]}
          </p>
          {landscape.existingSolutions.length > 0 && (
            <ul style={{ margin: "0 0 6px", paddingLeft: 18, fontSize: 13 }}>
              {landscape.existingSolutions.map((s) => (
                <li key={s.url} style={{ marginBottom: 4 }}>
                  <a href={s.url} target="_blank" rel="noreferrer">
                    {s.name}
                  </a>
                  {" — "}
                  {s.gap}
                </li>
              ))}
            </ul>
          )}
          <p className="mono" style={{ margin: 0, fontSize: 11, color: "var(--ink-soft)" }}>
            Checked {new Date(landscape.checkedAt).toLocaleDateString()} · query: &quot;{landscape.searchQueryUsed}&quot;
          </p>
        </div>
      ) : (
        <p style={{ fontSize: 13, color: "var(--ink-soft)", margin: "0 0 8px" }}>
          No check on file — the search may have failed at draft time.
        </p>
      )}

      <button
        type="button"
        disabled={busy}
        onClick={recheck}
        style={{
          padding: "5px 12px",
          background: "transparent",
          color: "var(--ink)",
          border: "1px solid var(--line)",
          borderRadius: "var(--r-chip)",
          fontSize: 12,
          fontWeight: 600,
          cursor: busy ? "default" : "pointer",
          opacity: busy ? 0.7 : 1,
        }}
      >
        {busy ? "Checking..." : landscape ? "Re-check" : "Run check"}
      </button>
      {error && <p style={{ color: "var(--coral, #C4432F)", fontSize: 12, margin: "6px 0 0" }}>{error}</p>}
    </div>
  );
}
