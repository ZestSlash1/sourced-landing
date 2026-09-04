import Link from "next/link";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth/require-admin";
import { listPendingReviewIdeas } from "@/lib/idea-drops/repository";
import AdminShell from "../admin-shell";
import PendingList from "./pending-list";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Part A4: the human check between an auto-drafted idea and it going live. */
export default async function PendingReviewPage() {
  const check = await requireAdmin();
  if (check.ok === false && check.status === 401) redirect("/admin/login");
  if (check.ok === false) {
    return (
      <AdminShell active="/admin/pending">
        <p>Signed in, but this account isn&apos;t an admin.</p>
      </AdminShell>
    );
  }

  const ideas = await listPendingReviewIdeas();
  const multiPlatformCount = ideas.filter(
    (i) => (i.platformCount ?? new Set(i.evidence.map((e) => e.platform)).size) >= 2
  ).length;

  return (
    <AdminShell active="/admin/pending">
      <div className="admin-page-head">
        <h1 className="display admin-page-title">Pending review</h1>
        <p className="mono admin-page-sub">
          {ideas.length === 0
            ? "Review queue is clear"
            : `${ideas.length} idea drop${ideas.length === 1 ? "" : "s"} awaiting human approval (${multiPlatformCount} cross-platform)`}
        </p>
      </div>

      {ideas.length === 0 ? (
        <div
          className="admin-card"
          style={{
            padding: "48px 24px",
            textAlign: "center",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 12,
          }}
        >
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: "50%",
              background: "rgba(16,185,129,0.12)",
              color: "#10B981",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 22,
              fontWeight: 700,
            }}
          >
            ✓
          </div>
          <div>
            <h2 style={{ fontSize: 17, margin: "0 0 6px", fontWeight: 600 }}>All caught up!</h2>
            <p style={{ color: "var(--ink-soft)", margin: 0, fontSize: 13.5 }}>
              No idea drafts are waiting in the approval queue. Next poller run will queue candidates here.
            </p>
          </div>
          <Link href="/admin" className="admin-btn admin-btn-ghost" style={{ marginTop: 8, textDecoration: "none" }}>
            View all ideas →
          </Link>
        </div>
      ) : (
        <PendingList ideas={ideas} />
      )}
    </AdminShell>
  );
}
