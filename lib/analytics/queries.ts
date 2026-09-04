import "server-only";
import { getSupabaseServerClient } from "@/lib/supabase/server";

const WINDOW_DAYS = 30;

export interface Breakdown {
  label: string;
  count: number;
}

export interface AnalyticsSummary {
  windowDays: number;
  uniqueSessions: number;
  signups: number;
  checkoutsCompleted: number;
  /** Percent, or null when there were no signups in the window to divide by. */
  conversionRate: number | null;
  eventsByType: Breakdown[];
  trafficByUtmSource: Breakdown[];
  trafficByReferrer: Breakdown[];
  topUnlockedBriefs: Breakdown[];
}

interface EventRow {
  event_type: string;
  session_id: string;
  utm_source: string | null;
  referrer: string | null;
}

interface UnlockRow {
  metadata: Record<string, unknown> | null;
}

function windowStartIso(): string {
  return new Date(Date.now() - WINDOW_DAYS * 24 * 60 * 60 * 1000).toISOString();
}

function countBy<T>(items: T[], label: (row: T) => string): Breakdown[] {
  const counts = new Map<string, number>();
  for (const item of items) {
    const key = label(item);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return Array.from(counts.entries())
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count);
}

export function referrerLabel(referrer: string | null): string {
  if (!referrer) return "(direct)";
  try {
    return new URL(referrer).hostname || referrer;
  } catch {
    return referrer;
  }
}

export const EMPTY_ANALYTICS_SUMMARY: AnalyticsSummary = {
  windowDays: WINDOW_DAYS,
  uniqueSessions: 0,
  signups: 0,
  checkoutsCompleted: 0,
  conversionRate: null,
  eventsByType: [],
  trafficByUtmSource: [],
  trafficByReferrer: [],
  topUnlockedBriefs: [],
};

/**
 * Aggregates the events table for /admin/analytics — a fixed 30-day window,
 * summarized in memory. Runs lightweight concurrent queries omitting heavy jsonb
 * payloads to guarantee sub-second execution and prevent Vercel 504 timeouts.
 */
export async function getAnalyticsSummary(): Promise<AnalyticsSummary> {
  try {
    const supabase = getSupabaseServerClient();
    const since = windowStartIso();

    const [eventsRes, unlocksRes] = await Promise.all([
      supabase
        .from("events")
        .select("event_type, session_id, utm_source, referrer")
        .gte("created_at", since)
        .limit(1000),
      supabase
        .from("events")
        .select("metadata")
        .eq("event_type", "brief_unlocked")
        .gte("created_at", since)
        .limit(50),
    ]);

    const events = (eventsRes.data ?? []) as EventRow[];
    const unlocks = (unlocksRes.data ?? []) as UnlockRow[];

    const uniqueSessions = new Set(events.map((e) => e.session_id)).size;
    const signups = events.filter((e) => e.event_type === "signup").length;
    const checkoutsCompleted = events.filter((e) => e.event_type === "checkout_completed").length;
    const conversionRate = signups > 0 ? (checkoutsCompleted / signups) * 100 : null;

    const pageViews = events.filter((e) => e.event_type === "page_view");

    return {
      windowDays: WINDOW_DAYS,
      uniqueSessions,
      signups,
      checkoutsCompleted,
      conversionRate,
      eventsByType: countBy(events, (e) => e.event_type),
      trafficByUtmSource: countBy(pageViews, (e) => e.utm_source ?? "(none)"),
      trafficByReferrer: countBy(pageViews, (e) => referrerLabel(e.referrer)),
      topUnlockedBriefs: countBy(unlocks, (e) => (e.metadata?.slug as string | undefined) ?? "(unknown)"),
    };
  } catch (err) {
    console.warn("[analytics] getAnalyticsSummary error:", err);
    return EMPTY_ANALYTICS_SUMMARY;
  }
}
