"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { CompetitiveLandscape } from "@/types/idea-drop";

const VERDICT_LABEL: Record<CompetitiveLandscape["verdict"], string> = {
  no_direct_competitor: "No direct competitor found",
  partial_overlap: "Partial overlap detected",
  close_competitor_exists: "Close competitor exists",
};

const VERDICT_COLOR: Record<CompetitiveLandscape["verdict"], string> = {
  no_direct_competitor: "var(--violet-deep)",
  partial_overlap: "#B8860B",
  close_competitor_exists: "#C4432F",
};

const VERDICT_BG: Record<CompetitiveLandscape["verdict"], string> = {
  no_direct_competitor: "rgba(124, 58, 237, 0.08)",
  partial_overlap: "rgba(245, 158, 11, 0.09)",
  close_competitor_exists: "rgba(239, 68, 68, 0.09)",
};

/**
 * Admin-facing surfacing of the competitive gap check (Part A4 companion).
 * Advisory only: a close_competitor_exists verdict doesn't block the Approve
 * button, it's displayed prominently so the admin makes the call explicitly.
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
    try {
      const res = await fetch(`/api/admin/ideas/${ideaId}/recheck-competitive`, { method: "POST" });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `Re-check failed (${res.status})`);
      }
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Re-check failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
        <p style={{ fontSize: 12, color: "var(--ink-soft)", margin: 0, fontWeight: 600 }}>
          Competitive Landscape Check:
        </p>
        <button
          type="button"
          disabled={busy}
          onClick={recheck}
          className="admin-btn admin-btn-ghost"
          style={{ fontSize: 11, padding: "3px 10px" }}
        >
          {busy ? "Checking..." : landscape ? "Re-run Check" : "Run Live Check"}
        </button>
      </div>

      <AnimatePresence mode="wait">
        {landscape ? (
          <motion.div
            key="landscape"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            style={{
              border: "1px solid var(--line)",
              borderRadius: "var(--r-sm)",
              padding: "12px 14px",
              background: VERDICT_BG[landscape.verdict],
              marginBottom: 6,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6, flexWrap: "wrap", gap: 6 }}>
              <span
                style={{
                  fontSize: 12.5,
                  fontWeight: 700,
                  color: VERDICT_COLOR[landscape.verdict],
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                ● {VERDICT_LABEL[landscape.verdict]}
              </span>
              <span className="mono" style={{ fontSize: 11, color: "var(--ink-soft)" }}>
                Checked {new Date(landscape.checkedAt).toLocaleDateString()}
              </span>
            </div>

            {landscape.existingSolutions && landscape.existingSolutions.length > 0 && (
              <div style={{ margin: "8px 0" }}>
                <div style={{ fontSize: 11.5, fontWeight: 600, color: "var(--ink)", marginBottom: 4 }}>
                  Identified Overlapping Solutions:
                </div>
                <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12.5, color: "var(--ink)" }}>
                  {landscape.existingSolutions.map((s) => (
                    <li key={s.url || s.name} style={{ marginBottom: 4 }}>
                      <a
                        href={s.url}
                        target="_blank"
                        rel="noreferrer"
                        style={{ fontWeight: 600, color: "var(--ink)", textDecoration: "underline" }}
                      >
                        {s.name}
                      </a>
                      {" — "}
                      <span style={{ color: "var(--ink-soft)" }}>{s.gap}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <p className="mono" style={{ margin: 0, fontSize: 10.5, color: "var(--ink-soft)" }}>
              Query: &quot;{landscape.searchQueryUsed}&quot;
            </p>
          </motion.div>
        ) : (
          <motion.p
            key="empty"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              fontSize: 12.5,
              color: "var(--ink-soft)",
              margin: 0,
              padding: "8px 12px",
              borderRadius: "var(--r-sm)",
              background: "var(--bg)",
              border: "1px dashed var(--line)",
            }}
          >
            No competitive search record on file. Search may have timed out or was unseeded at draft time.
          </motion.p>
        )}
      </AnimatePresence>

      {error && <p style={{ color: "var(--coral-deep)", fontSize: 11.5, margin: "6px 0 0" }}>{error}</p>}
    </div>
  );
}
