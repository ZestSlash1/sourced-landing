import Link from "next/link";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth/require-admin";
import { getAnalyticsSummary, type Breakdown } from "@/lib/analytics/queries";

export const dynamic = "force-dynamic";

export default async function AnalyticsPage() {
  const check = await requireAdmin();

  if (check.ok === false && check.status === 401) {
    redirect("/admin/login");
  }
  if (check.ok === false) {
    return (
      <main style={{ maxWidth: 480, margin: "80px auto", padding: "0 24px" }}>
        <p>Signed in, but this account isn&apos;t an admin.</p>
      </main>
    );
  }

  const summary = await getAnalyticsSummary();
  const conversionLabel =
    summary.conversionRate === null ? "—" : `${summary.conversionRate.toFixed(1)}%`;

  return (
    <main style={{ maxWidth: 960, margin: "0 auto", padding: "40px 24px" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 28,
        }}
      >
        <h1 className="display" style={{ fontSize: 24, margin: 0 }}>
          Analytics
        </h1>
        <Link href="/admin" style={{ fontSize: 13, color: "var(--ink-soft)" }}>
          Back to all ideas
        </Link>
      </div>

      <p className="mono" style={{ fontSize: 12, color: "var(--ink-soft)", margin: "0 0 24px" }}>
        Last {summary.windowDays} days
      </p>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: 12,
          marginBottom: 36,
        }}
      >
        <StatCard label="Unique sessions" value={summary.uniqueSessions.toLocaleString()} />
        <StatCard label="Signups" value={summary.signups.toLocaleString()} />
        <StatCard label="Checkouts completed" value={summary.checkoutsCompleted.toLocaleString()} />
        <StatCard label="Signup → paid" value={conversionLabel} />
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
          gap: 24,
        }}
      >
        <BreakdownTable title="Events by type" rows={summary.eventsByType} labelHeader="Event" />
        <BreakdownTable title="Traffic by UTM source" rows={summary.trafficByUtmSource} labelHeader="Source" />
        <BreakdownTable title="Traffic by referrer" rows={summary.trafficByReferrer} labelHeader="Referrer" />
        <BreakdownTable title="Top unlocked briefs" rows={summary.topUnlockedBriefs} labelHeader="Slug" />
      </div>
    </main>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        background: "var(--surface)",
        border: "1px solid var(--line)",
        borderRadius: "var(--r-lg)",
        padding: "18px 20px",
      }}
    >
      <div
        className="mono"
        style={{
          fontSize: 11.5,
          fontWeight: 600,
          color: "var(--violet-deep)",
          letterSpacing: "0.05em",
          textTransform: "uppercase",
          marginBottom: 8,
        }}
      >
        {label}
      </div>
      <div className="display" style={{ fontSize: 28, fontWeight: 700 }}>
        {value}
      </div>
    </div>
  );
}

function BreakdownTable({
  title,
  rows,
  labelHeader,
}: {
  title: string;
  rows: Breakdown[];
  labelHeader: string;
}) {
  return (
    <div
      style={{
        background: "var(--surface)",
        border: "1px solid var(--line)",
        borderRadius: "var(--r-lg)",
        padding: 20,
      }}
    >
      <h2 style={{ fontSize: 15, margin: "0 0 14px" }}>{title}</h2>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13.5 }}>
        <thead>
          <tr style={{ textAlign: "left", borderBottom: "1px solid var(--line)" }}>
            <th style={{ padding: "6px 4px", color: "var(--ink-soft)", fontWeight: 500 }}>{labelHeader}</th>
            <th style={{ padding: "6px 4px", color: "var(--ink-soft)", fontWeight: 500, textAlign: "right" }}>
              Count
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.slice(0, 10).map((row) => (
            <tr key={row.label} style={{ borderBottom: "1px solid var(--line)" }}>
              <td style={{ padding: "8px 4px", wordBreak: "break-all" }}>{row.label}</td>
              <td style={{ padding: "8px 4px", textAlign: "right" }}>{row.count.toLocaleString()}</td>
            </tr>
          ))}
          {rows.length === 0 && (
            <tr>
              <td colSpan={2} style={{ padding: "16px 4px", color: "var(--ink-soft)" }}>
                No data yet.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
