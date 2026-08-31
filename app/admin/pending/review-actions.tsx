"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function ReviewActions({
  ideaId,
  hasCloseCompetitor,
}: {
  ideaId: string;
  hasCloseCompetitor?: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function setStatus(status: "published" | "draft") {
    if (status === "published" && hasCloseCompetitor) {
      const confirmed = window.confirm(
        "This idea has an existing close competitor per the competitive landscape check — publish anyway?",
      );
      if (!confirmed) return;
    }
    setBusy(true);
    await fetch(`/api/admin/ideas/${ideaId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    setBusy(false);
    router.refresh();
  }

  return (
    <div style={{ display: "flex", gap: 8 }}>
      <button
        type="button"
        disabled={busy}
        onClick={() => setStatus("published")}
        style={{
          padding: "7px 16px",
          background: "var(--violet)",
          color: "#fff",
          border: "none",
          borderRadius: "var(--r-chip)",
          fontSize: 13,
          fontWeight: 600,
          cursor: busy ? "default" : "pointer",
          opacity: busy ? 0.7 : 1,
        }}
      >
        Approve
      </button>
      <button
        type="button"
        disabled={busy}
        onClick={() => setStatus("draft")}
        style={{
          padding: "7px 16px",
          background: "rgba(255,111,94,0.12)",
          color: "#C4432F",
          border: "none",
          borderRadius: "var(--r-chip)",
          fontSize: 13,
          fontWeight: 600,
          cursor: busy ? "default" : "pointer",
          opacity: busy ? 0.7 : 1,
        }}
      >
        Reject
      </button>
    </div>
  );
}
