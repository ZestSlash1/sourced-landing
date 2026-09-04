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
  const publishedCount = ideas.filter((i) => i.status === "published").length;
  const pendingCount = ideas.filter((i) => i.status === "pending_review").length;
  const draftCount = ideas.filter((i) => i.status === "draft" || i.status === "needs_evidence").length;

  return (
    <AdminShell active="/admin">
      <div className="admin-page-head">
        <h1 className="display admin-page-title">Idea drops</h1>
        <p className="mono admin-page-sub">
          Directory of ingested, synthesized, and published micro-SaaS drops
        </p>
      </div>

      {/* KPI Cards */}
      <div className="admin-kpis">
        <div className="admin-kpi-card">
          <span className="admin-kpi-lbl">Total Ideas</span>
          <span className="admin-kpi-val">{ideas.length}</span>
          <span className="admin-kpi-sub">Synthesized across all runs</span>
        </div>
        <div className="admin-kpi-card" style={{ borderLeft: "3px solid var(--violet)" }}>
          <span className="admin-kpi-lbl" style={{ color: "var(--violet-deep)" }}>Published</span>
          <span className="admin-kpi-val" style={{ color: "var(--violet-deep)" }}>{publishedCount}</span>
          <span className="admin-kpi-sub">Live in feed & marketplace</span>
        </div>
        <div className="admin-kpi-card" style={{ borderLeft: "3px solid #F59E0B" }}>
          <span className="admin-kpi-lbl" style={{ color: "#B45309" }}>Pending Review</span>
          <span className="admin-kpi-val" style={{ color: "#B45309" }}>{pendingCount}</span>
          <span className="admin-kpi-sub">Awaiting human approval</span>
        </div>
        <div className="admin-kpi-card" style={{ borderLeft: "3px solid var(--line)" }}>
          <span className="admin-kpi-lbl">Drafts & Backlog</span>
          <span className="admin-kpi-val">{draftCount}</span>
          <span className="admin-kpi-sub">Needs evidence or refinement</span>
        </div>
      </div>

      <IdeasList ideas={ideas} />
    </AdminShell>
  );
}
