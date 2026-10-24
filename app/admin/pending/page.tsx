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
  const singlePlatformCount = ideas.length - multiPlatformCount;
  const competitorFlaggedCount = ideas.filter(
    (i) => i.competitiveLandscape?.verdict === "close_competitor_exists"
  ).length;

  return (
    <AdminShell active="/admin/pending">
      <div className="admin-page-head">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", flexWrap: "wrap", gap: 12 }}>
          <div>
            <h1 className="display admin-page-title">Pending Review Queue</h1>
            <p className="mono admin-page-sub">
              Fast-triage command center: review auto-drafted candidates, inspect signal triangulation, and approve or reject in-place.
            </p>
          </div>
          {ideas.length > 0 && (
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <span
                className="mono"
                style={{
                  fontSize: 12,
                  padding: "4px 10px",
                  borderRadius: "var(--r-chip)",
                  background: "rgba(124, 58, 237, 0.1)",
                  color: "var(--violet-deep)",
                  fontWeight: 600,
                }}
              >
                {ideas.length} awaiting triage
              </span>
            </div>
          )}
        </div>

        {ideas.length > 0 && (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
              gap: 12,
              marginTop: 16,
            }}
          >
            <div className="admin-card" style={{ padding: "12px 16px" }}>
              <div style={{ fontSize: 11, color: "var(--ink-soft)", textTransform: "uppercase", letterSpacing: "0.04em", fontFamily: "'JetBrains Mono', monospace" }}>
                Total in Queue
              </div>
              <div style={{ fontSize: 24, fontWeight: 700, marginTop: 4 }}>{ideas.length}</div>
            </div>
            <div className="admin-card" style={{ padding: "12px 16px" }}>
              <div style={{ fontSize: 11, color: "var(--ink-soft)", textTransform: "uppercase", letterSpacing: "0.04em", fontFamily: "'JetBrains Mono', monospace" }}>
                Cross-Platform (2+)
              </div>
              <div style={{ fontSize: 24, fontWeight: 700, color: "var(--violet-deep)", marginTop: 4 }}>
                {multiPlatformCount}
              </div>
            </div>
            <div className="admin-card" style={{ padding: "12px 16px" }}>
              <div style={{ fontSize: 11, color: "var(--ink-soft)", textTransform: "uppercase", letterSpacing: "0.04em", fontFamily: "'JetBrains Mono', monospace" }}>
                Single-Source
              </div>
              <div style={{ fontSize: 24, fontWeight: 700, color: "var(--ink)", marginTop: 4 }}>
                {singlePlatformCount}
              </div>
            </div>
            <div className="admin-card" style={{ padding: "12px 16px" }}>
              <div style={{ fontSize: 11, color: "var(--ink-soft)", textTransform: "uppercase", letterSpacing: "0.04em", fontFamily: "'JetBrains Mono', monospace" }}>
                Close Competitors
              </div>
              <div
                style={{
                  fontSize: 24,
                  fontWeight: 700,
                  color: competitorFlaggedCount > 0 ? "var(--coral-deep)" : "#047857",
                  marginTop: 4,
                }}
              >
                {competitorFlaggedCount}
              </div>
            </div>
          </div>
        )}
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
            <h2 style={{ fontSize: 17, margin: "0 0 6px", fontWeight: 600 }}>Review queue is clear!</h2>
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
