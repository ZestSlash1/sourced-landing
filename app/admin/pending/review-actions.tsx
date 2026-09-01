"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { motion } from "framer-motion";

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
        "This idea has an existing close competitor per the competitive landscape check. Publish anyway?",
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
      <motion.button
        type="button"
        disabled={busy}
        onClick={() => setStatus("published")}
        className="admin-btn admin-btn-primary"
        whileHover={busy ? undefined : { scale: 1.03 }}
        whileTap={busy ? undefined : { scale: 0.97 }}
        transition={{ type: "spring", stiffness: 260, damping: 26 }}
      >
        Approve
      </motion.button>
      <motion.button
        type="button"
        disabled={busy}
        onClick={() => setStatus("draft")}
        className="admin-btn admin-btn-danger"
        whileHover={busy ? undefined : { scale: 1.03 }}
        whileTap={busy ? undefined : { scale: 0.97 }}
        transition={{ type: "spring", stiffness: 260, damping: 26 }}
      >
        Reject
      </motion.button>
    </div>
  );
}
