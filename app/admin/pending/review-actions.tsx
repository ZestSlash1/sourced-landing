"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

export default function ReviewActions({
  ideaId,
  hasCloseCompetitor,
  onStatusChange,
}: {
  ideaId: string;
  hasCloseCompetitor?: boolean;
  onStatusChange?: (status: "published" | "draft") => void;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [showCompetitorConfirm, setShowCompetitorConfirm] = useState(false);
  const [optimisticStatus, setOptimisticStatus] = useState<
    "idle" | "approving" | "rejecting" | "published" | "draft" | "error"
  >("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  async function executeSetStatus(status: "published" | "draft") {
    setBusy(true);
    setErrorMsg(null);
    setOptimisticStatus(status === "published" ? "approving" : "rejecting");

    try {
      const res = await fetch(`/api/admin/ideas/${ideaId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `Request failed (${res.status})`);
      }

      setOptimisticStatus(status);
      onStatusChange?.(status);
      setShowCompetitorConfirm(false);
      router.refresh();
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Failed to update status");
      setOptimisticStatus("error");
      setBusy(false);
    }
  }

  function handleApproveClick() {
    if (hasCloseCompetitor) {
      setShowCompetitorConfirm(true);
      return;
    }
    executeSetStatus("published");
  }

  if (optimisticStatus === "published") {
    return (
      <div
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          padding: "6px 12px",
          borderRadius: "var(--r-chip)",
          background: "rgba(16, 185, 129, 0.12)",
          color: "#047857",
          fontSize: 12.5,
          fontWeight: 600,
        }}
      >
        ✓ Approved &amp; Published Live!
      </div>
    );
  }

  if (optimisticStatus === "draft") {
    return (
      <div
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          padding: "6px 12px",
          borderRadius: "var(--r-chip)",
          background: "rgba(0, 0, 0, 0.06)",
          color: "var(--ink-soft)",
          fontSize: 12.5,
          fontWeight: 600,
        }}
      >
        ✓ Rejected &amp; Saved as Draft
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <AnimatePresence>
        {showCompetitorConfirm && (
          <motion.div
            initial={{ opacity: 0, y: -6, height: 0 }}
            animate={{ opacity: 1, y: 0, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            style={{
              padding: "10px 14px",
              background: "rgba(239, 68, 68, 0.08)",
              border: "1px solid rgba(239, 68, 68, 0.3)",
              borderRadius: "var(--r-sm)",
              marginBottom: 4,
            }}
          >
            <p style={{ margin: "0 0 8px", fontSize: 12.5, fontWeight: 600, color: "#C4432F" }}>
              ⚠️ Close competitor flagged by telemetry search. Are you sure you want to approve this drop?
            </p>
            <div style={{ display: "flex", gap: 8 }}>
              <button
                type="button"
                disabled={busy}
                onClick={() => executeSetStatus("published")}
                className="admin-btn admin-btn-danger"
                style={{ fontSize: 12, padding: "5px 12px" }}
              >
                {busy && optimisticStatus === "approving" ? "Publishing..." : "Confirm Publish Anyway"}
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => setShowCompetitorConfirm(false)}
                className="admin-btn admin-btn-ghost"
                style={{ fontSize: 12, padding: "5px 12px" }}
              >
                Cancel
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <motion.button
          type="button"
          disabled={busy}
          onClick={handleApproveClick}
          className="admin-btn admin-btn-primary"
          style={{
            fontSize: 12.5,
            padding: "6px 16px",
            background: "var(--violet)",
          }}
          whileHover={busy ? undefined : { scale: 1.02 }}
          whileTap={busy ? undefined : { scale: 0.98 }}
        >
          {busy && optimisticStatus === "approving" ? "Publishing..." : "Approve & Publish"}
        </motion.button>

        <motion.button
          type="button"
          disabled={busy}
          onClick={() => executeSetStatus("draft")}
          className="admin-btn admin-btn-danger"
          style={{ fontSize: 12.5, padding: "6px 14px" }}
          whileHover={busy ? undefined : { scale: 1.02 }}
          whileTap={busy ? undefined : { scale: 0.98 }}
        >
          {busy && optimisticStatus === "rejecting" ? "Rejecting..." : "Reject to Draft"}
        </motion.button>
      </div>

      {errorMsg && (
        <p style={{ color: "var(--coral-deep)", fontSize: 12, margin: 0 }}>
          {errorMsg}
        </p>
      )}
    </div>
  );
}
