import { redirect } from "next/navigation";
import { Users, UserPlus, CreditCard, TrendingUp } from "lucide";
import { requireAdmin } from "@/lib/auth/require-admin";
import { getAnalyticsSummary } from "@/lib/analytics/queries";
import { getLiveAnalytics } from "@/lib/analytics/live-queries";
import { listRecentPipelineRuns } from "@/lib/ingest/pipeline-runs-repository";
import AdminShell from "../admin-shell";
import { StatCard } from "./stat-card";
import { LiveAnalyticsView } from "./live-analytics-view";
import { StatGrid, BreakdownGrid, BreakdownCard, PipelineTableCard, ProviderMixCard } from "./analytics-client";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

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

  const [summary, liveData, pipelineRuns] = await Promise.all([
    getAnalyticsSummary(),
    getLiveAnalytics("24h"),
    listRecentPipelineRuns(10),
  ]);
  const conversionLabel = summary.conversionRate === null ? "—" : `${summary.conversionRate.toFixed(1)}%`;

  return (
    <AdminShell active="/admin/analytics">
      <div className="admin-page-head">
        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <h1 className="display admin-page-title" style={{ margin: 0 }}>Analytics</h1>
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              fontSize: 11.5,
              fontWeight: 700,
              fontFamily: "'JetBrains Mono'",
              color: "#10B981",
              background: "rgba(16,185,129,0.12)",
              padding: "4px 10px",
              borderRadius: "var(--r-chip)",
              textTransform: "uppercase",
              letterSpacing: "0.04em",
            }}
          >
            <span className="admin-live-dot" /> Live Telemetry
          </span>
        </div>
        <p className="mono admin-page-sub" style={{ marginTop: 6 }}>
          Last {summary.windowDays} days · real-time 3D visitor globe & event breakdowns
        </p>
      </div>

      <StatGrid>
        <StatCard icon={Users} accent="violet" label="Unique sessions" value={summary.uniqueSessions.toLocaleString()} />
        <StatCard icon={UserPlus} accent="sky" label="Signups" value={summary.signups.toLocaleString()} />
        <StatCard icon={CreditCard} accent="sun" label="Checkouts completed" value={summary.checkoutsCompleted.toLocaleString()} />
        <StatCard icon={TrendingUp} accent="coral" label="Signup → paid" value={conversionLabel} />
      </StatGrid>

      <div style={{ marginBottom: 20 }}>
        <LiveAnalyticsView initialData={liveData} initialWindow="24h" />
      </div>

      <BreakdownGrid>
        <BreakdownCard title="Events by type" rows={summary.eventsByType} accent="violet" />
        <BreakdownCard title="Top unlocked briefs" rows={summary.topUnlockedBriefs} accent="coral" />
        <BreakdownCard title="Traffic by UTM source" rows={summary.trafficByUtmSource} accent="sky" />
        <BreakdownCard title="Traffic by referrer" rows={summary.trafficByReferrer} accent="sun" />
      </BreakdownGrid>

      <ProviderMixCard pipelineRuns={pipelineRuns} />
      <PipelineTableCard pipelineRuns={pipelineRuns} />
    </AdminShell>
  );
}
