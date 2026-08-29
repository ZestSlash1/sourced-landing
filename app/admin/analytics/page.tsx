import { redirect } from "next/navigation";
import { Users, UserPlus, CreditCard, TrendingUp } from "lucide";
import { requireAdmin } from "@/lib/auth/require-admin";
import { getAnalyticsSummary, getRecentViewerLocations, type Breakdown } from "@/lib/analytics/queries";
import AdminShell from "../admin-shell";
import { ACCENTS } from "./accents";
import { StatCard } from "./stat-card";
import { ViewerGlobe } from "./viewer-globe";

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
  const conversionLabel = summary.conversionRate === null ? "—" : `${summary.conversionRate.toFixed(1)}%`;

  return (
    <AdminShell active="/admin/analytics">
      <div style={{ marginBottom: 28 }}>
        <h1 className="display" style={{ fontSize: 28, margin: "0 0 6px", letterSpacing: "-0.015em" }}>
          Analytics
        </h1>
        <p className="mono" style={{ fontSize: 12.5, color: "var(--ink-soft)", margin: 0 }}>
          Last {summary.windowDays} days · from the events table, live
        </p>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: 14,
          marginBottom: 20,
        }}
      >
        <StatCard icon={Users} accent="violet" label="Unique sessions" value={summary.uniqueSessions.toLocaleString()} />
        <StatCard icon={UserPlus} accent="sky" label="Signups" value={summary.signups.toLocaleString()} />
        <StatCard icon={CreditCard} accent="sun" label="Checkouts completed" value={summary.checkoutsCompleted.toLocaleString()} />
        <StatCard icon={TrendingUp} accent="coral" label="Signup → paid" value={conversionLabel} />
      </div>

      <div style={{ marginBottom: 16 }}>
        <ViewerGlobe locations={viewerLocations} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(380px, 1fr))", gap: 16 }}>
        <BreakdownCard title="Events by type" rows={summary.eventsByType} accent="violet" />
        <BreakdownCard title="Top unlocked briefs" rows={summary.topUnlockedBriefs} accent="coral" />
        <BreakdownCard title="Traffic by UTM source" rows={summary.trafficByUtmSource} accent="sky" />
        <BreakdownCard title="Traffic by referrer" rows={summary.trafficByReferrer} accent="sun" />
      </div>
    </AdminShell>
  );
}

function BreakdownCard({
  title,
  rows,
  accent,
}: {
  title: string;
  rows: Breakdown[];
  accent: keyof typeof ACCENTS;
}) {
  const colors = ACCENTS[accent];
  const top = rows.slice(0, 8);
  const max = top.length > 0 ? top[0].count : 0;

  return (
    <div
      style={{
        background: "var(--surface)",
        border: "1px solid var(--line)",
        borderRadius: "var(--r-xl)",
        padding: "20px 22px",
        boxShadow: "var(--shadow)",
      }}
    >
      <h2 style={{ fontSize: 14.5, fontWeight: 600, margin: "0 0 16px" }}>{title}</h2>

      {top.length === 0 ? (
        <p style={{ fontSize: 13, color: "var(--ink-soft)", margin: 0 }}>No data yet.</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {top.map((row) => {
            const width = max > 0 ? Math.max(6, Math.round((row.count / max) * 100)) : 0;
            return (
              <div key={row.label}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    fontSize: 13,
                    marginBottom: 5,
                    gap: 12,
                  }}
                >
                  <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {row.label}
                  </span>
                  <span className="mono" style={{ color: "var(--ink-soft)", flexShrink: 0 }}>
                    {row.count.toLocaleString()}
                  </span>
                </div>
                <div style={{ height: 6, borderRadius: "var(--r-chip)", background: colors.tint, overflow: "hidden" }}>
                  <div
                    style={{
                      height: "100%",
                      width: `${width}%`,
                      borderRadius: "var(--r-chip)",
                      background: colors.bar,
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
