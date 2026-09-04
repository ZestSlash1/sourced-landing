import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/require-admin";
import { getLiveAnalytics, type LiveWindow } from "@/lib/analytics/live-queries";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * GET /api/admin/analytics/live?window=24h|live — polled by
 * /admin/analytics/live every 10s to drive the globe, KPIs, breakdown tabs,
 * and live session feed.
 */
export async function GET(request: Request) {
  const check = await requireAdmin();
  if (check.ok === false) {
    return NextResponse.json({ error: check.status === 401 ? "Unauthorized" : "Forbidden" }, { status: check.status });
  }

  const windowParam = new URL(request.url).searchParams.get("window");
  const window: LiveWindow = windowParam === "live" ? "live" : "24h";

  const data = await getLiveAnalytics(window);
  return NextResponse.json(data);
}
