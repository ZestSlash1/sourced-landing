import Link from "next/link";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth/require-admin";
import { listAllIdeas } from "@/lib/idea-drops/repository";
import AdminShell from "./admin-shell";
import IdeasList from "./ideas-list";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export default async function AdminDashboard() {
  const check = await requireAdmin();

  if (check.ok === false && check.status === 401) {
    redirect("/admin/login");
  }

  if (check.ok === false) {
    return (
      <AdminShell active="/admin">
        <p>Signed in, but this account isn&apos;t an admin.</p>
      </AdminShell>
    );
  }

  const ideas = await listAllIdeas();
  const totalCount = ideas.length;
  const publishedCount = ideas.filter((i) => i.status === "published").length;
  const pendingCount = ideas.filter((i) => i.status === "pending_review").length;
  const draftCount = ideas.filter((i) => i.status === "draft" || i.status === "needs_evidence").length;

  const publishedPct = totalCount > 0 ? Math.round((publishedCount / totalCount) * 100) : 0;
  const pendingPct = totalCount > 0 ? Math.round((pendingCount / totalCount) * 100) : 0;
  const draftPct = totalCount > 0 ? Math.round((draftCount / totalCount) * 100) : 0;

  return (
    <AdminShell active="/admin">
      <div className="admin-page-head" style={{ marginBottom: 20 }}>
        <h1 className="display admin-page-title" style={{ fontSize: 26, fontWeight: 700, margin: 0, letterSpacing: "-0.015em" }}>
          Idea drops
        </h1>
        <p className="mono admin-page-sub" style={{ fontSize: 12, color: "var(--ink-soft)", marginTop: 4 }}>
          Directory of ingested, synthesized, and published micro-SaaS drops
        </p>
      </div>

      {/* KPI Cards */}
      <div
        className="admin-kpis"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: 14,
          marginBottom: 24,
        }}
      >
        {/* Total Ideas */}
        <div
          className="admin-kpi-card"
          style={{
            background: "linear-gradient(180deg, rgba(22, 24, 36, 0.85) 0%, rgba(16, 18, 26, 0.95) 100%)",
            border: "1px solid rgba(255, 255, 255, 0.08)",
            borderRadius: "var(--r-xl)",
            padding: "18px 20px",
            boxShadow: "0 4px 16px rgba(0, 0, 0, 0.3)",
          }}
        >
          <span className="admin-kpi-lbl mono" style={{ fontSize: 11, letterSpacing: "0.06em", color: "var(--ink-soft)", textTransform: "uppercase" }}>
            Total Ideas
          </span>
          <span
            className="admin-kpi-val display"
            style={{ fontSize: 32, fontWeight: 700, color: "var(--ink)", fontVariantNumeric: "tabular-nums", lineHeight: 1.1, margin: "4px 0" }}
          >
            {totalCount.toLocaleString()}
          </span>
          <span className="admin-kpi-sub" style={{ fontSize: 12, color: "var(--ink-soft)" }}>
            100% · Synthesized across all runs
          </span>
        </div>

        {/* Published */}
        <div
          className="admin-kpi-card"
          style={{
            background: "linear-gradient(180deg, rgba(22, 24, 36, 0.85) 0%, rgba(16, 18, 26, 0.95) 100%)",
            border: "1px solid rgba(255, 255, 255, 0.08)",
            borderLeft: "3px solid var(--violet)",
            borderRadius: "var(--r-xl)",
            padding: "18px 20px",
            boxShadow: "0 4px 16px rgba(0, 0, 0, 0.3)",
          }}
        >
          <span className="admin-kpi-lbl mono" style={{ fontSize: 11, letterSpacing: "0.06em", color: "var(--violet-deep)", textTransform: "uppercase" }}>
            Published
          </span>
          <span
            className="admin-kpi-val display"
            style={{ fontSize: 32, fontWeight: 700, color: "var(--violet-deep)", fontVariantNumeric: "tabular-nums", lineHeight: 1.1, margin: "4px 0" }}
          >
            {publishedCount.toLocaleString()}
          </span>
          <span className="admin-kpi-sub" style={{ fontSize: 12, color: "var(--ink-soft)" }}>
            {publishedPct}% of total · Live in feed & marketplace
          </span>
        </div>

        {/* Pending Review */}
        <div
          className="admin-kpi-card"
          style={{
            background: "linear-gradient(180deg, rgba(22, 24, 36, 0.85) 0%, rgba(16, 18, 26, 0.95) 100%)",
            border: "1px solid rgba(255, 255, 255, 0.08)",
            borderLeft: "3px solid #F59E0B",
            borderRadius: "var(--r-xl)",
            padding: "18px 20px",
            boxShadow: "0 4px 16px rgba(0, 0, 0, 0.3)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span className="admin-kpi-lbl mono" style={{ fontSize: 11, letterSpacing: "0.06em", color: "#F59E0B", textTransform: "uppercase" }}>
              Pending Review
            </span>
            <Link
              href="/admin/pending"
              className="mono"
              style={{
                fontSize: 10.5,
                color: "#F59E0B",
                textDecoration: "none",
                padding: "2px 7px",
                borderRadius: 4,
                background: "rgba(245, 158, 11, 0.12)",
                border: "1px solid rgba(245, 158, 11, 0.25)",
                fontWeight: 600,
                display: "inline-flex",
                alignItems: "center",
                gap: 3,
                transition: "background 0.15s ease",
              }}
              title="Navigate to pending review queue"
            >
              Review queue →
            </Link>
          </div>
          <span
            className="admin-kpi-val display"
            style={{ fontSize: 32, fontWeight: 700, color: "#F59E0B", fontVariantNumeric: "tabular-nums", lineHeight: 1.1, margin: "4px 0" }}
          >
            {pendingCount.toLocaleString()}
          </span>
          <span className="admin-kpi-sub" style={{ fontSize: 12, color: "var(--ink-soft)" }}>
            {pendingPct}% of total · Awaiting human approval
          </span>
        </div>

        {/* Drafts & Backlog */}
        <div
          className="admin-kpi-card"
          style={{
            background: "linear-gradient(180deg, rgba(22, 24, 36, 0.85) 0%, rgba(16, 18, 26, 0.95) 100%)",
            border: "1px solid rgba(255, 255, 255, 0.08)",
            borderLeft: "3px solid rgba(255, 255, 255, 0.2)",
            borderRadius: "var(--r-xl)",
            padding: "18px 20px",
            boxShadow: "0 4px 16px rgba(0, 0, 0, 0.3)",
          }}
        >
          <span className="admin-kpi-lbl mono" style={{ fontSize: 11, letterSpacing: "0.06em", color: "var(--ink-soft)", textTransform: "uppercase" }}>
            Drafts & Backlog
          </span>
          <span
            className="admin-kpi-val display"
            style={{ fontSize: 32, fontWeight: 700, color: "var(--ink)", fontVariantNumeric: "tabular-nums", lineHeight: 1.1, margin: "4px 0" }}
          >
            {draftCount.toLocaleString()}
          </span>
          <span className="admin-kpi-sub" style={{ fontSize: 12, color: "var(--ink-soft)" }}>
            {draftPct}% of total · Needs evidence or refinement
          </span>
        </div>
      </div>

      <IdeasList ideas={ideas} />
    </AdminShell>
  );
}
