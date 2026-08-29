"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function ReviewActions({ ideaId }: { ideaId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function setStatus(status: "published" | "draft") {
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
          padding: "6px 12px",
          background: "var(--violet)",
          color: "#fff",
          border: "none",
          borderRadius: "var(--r-sm)",
          fontSize: 13,
          cursor: busy ? "default" : "pointer",
        }}
      >
        Approve
      </button>
      <button
        type="button"
        disabled={busy}
        onClick={() => setStatus("draft")}
        style={{
          padding: "6px 12px",
          background: "transparent",
          color: "var(--coral)",
          border: "1px solid var(--coral)",
          borderRadius: "var(--r-sm)",
          fontSize: 13,
          cursor: busy ? "default" : "pointer",
        }}
      >
        Reject
      </button>
    </div>
  );
}
