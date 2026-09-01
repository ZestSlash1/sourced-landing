import { redirect } from "next/navigation";
import Link from "next/link";
import { Users, UserPlus, CreditCard, TrendingUp } from "lucide";
import { requireAdmin } from "@/lib/auth/require-admin";
import { getAnalyticsSummary, getRecentViewerLocations } from "@/lib/analytics/queries";
import { listRecentPipelineRuns } from "@/lib/ingest/pipeline-runs-repository";
import AdminShell from "../admin-shell";
import { StatCard } from "./stat-card";
import { ViewerGlobe } from "./viewer-globe";
import { StatGrid, BreakdownGrid, BreakdownCard, PipelineTableCard } from "./analytics-client";

export const dynamic = "force-dynamic";

export default async function AnalyticsPage() {
  const check = await requireAdmin();

  if (check.ok === false && check.status === 401) {
    redirect("/admin/login");
  }
  if (check.ok === false) {
    return (
      <AdminShell active="/admin/analytics">
        <p>Signed in, but this account isn&apos;t an admin.</p>
      </AdminShell>
    );
  }

  const summary = await getAnalyticsSummary();
  const viewerLocations = await getRecentViewerLocations();
  const pipelineRuns = await listRecentPipelineRuns(10);
  const conversionLabel = summary.conversionRate === null ? "—" : `${summary.conversionRate.toFixed(1)}%`;

  return (
    <AdminShell active="/admin/analytics">
      <div className="admin-page-head" style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
        <div>
          <h1 className="display admin-page-title">Analytics</h1>
          <p className="mono admin-page-sub">Last {summary.windowDays} days · from the events table, live</p>
        </div>
        <Link
          href="/admin/analytics/live"
          className="mono"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            fontSize: 12.5,
            color: "var(--ink)",
            background: "var(--surface)",
            border: "1px solid var(--line)",
            borderRadius: "var(--r-chip)",
            padding: "9px 16px",
          }}
        >
          Live globe →
        </Link>
      </div>

      <StatGrid>
        <StatCard icon={Users} accent="violet" label="Unique sessions" value={summary.uniqueSessions.toLocaleString()} />
        <StatCard icon={UserPlus} accent="sky" label="Signups" value={summary.signups.toLocaleString()} />
        <StatCard icon={CreditCard} accent="sun" label="Checkouts completed" value={summary.checkoutsCompleted.toLocaleString()} />
        <StatCard icon={TrendingUp} accent="coral" label="Signup → paid" value={conversionLabel} />
      </StatGrid>

      <div style={{ marginBottom: 16 }}>
        <ViewerGlobe locations={viewerLocations} />
      </div>

      <BreakdownGrid>
        <BreakdownCard title="Events by type" rows={summary.eventsByType} accent="violet" />
        <BreakdownCard title="Top unlocked briefs" rows={summary.topUnlockedBriefs} accent="coral" />
        <BreakdownCard title="Traffic by UTM source" rows={summary.trafficByUtmSource} accent="sky" />
        <BreakdownCard title="Traffic by referrer" rows={summary.trafficByReferrer} accent="sun" />
      </BreakdownGrid>

      <PipelineTableCard pipelineRuns={pipelineRuns} />
    </AdminShell>
  );
}
