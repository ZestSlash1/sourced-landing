import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth/require-admin";
import { getLiveAnalytics } from "@/lib/analytics/live-queries";
import AdminShell from "../../admin-shell";
import { LiveAnalyticsView } from "./live-analytics-view";

export const dynamic = "force-dynamic";

export default async function LiveAnalyticsPage() {
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

  const data = await getLiveAnalytics("24h");

  return <LiveAnalyticsView initialData={data} initialWindow="24h" />;
}
