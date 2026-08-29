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
  metadata: Record<string, unknown> | null;
}

function windowStartIso(): string {
  return new Date(Date.now() - WINDOW_DAYS * 24 * 60 * 60 * 1000).toISOString();
}

function countBy(items: EventRow[], label: (row: EventRow) => string): Breakdown[] {
  const counts = new Map<string, number>();
  for (const item of items) {
    const key = label(item);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return Array.from(counts.entries())
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count);
}

function referrerLabel(referrer: string | null): string {
  if (!referrer) return "(direct)";
  try {
    return new URL(referrer).hostname || referrer;
  } catch {
    return referrer;
  }
}

export interface ViewerLocation {
  city: string | null;
  country: string | null;
  latitude: number;
  longitude: number;
  count: number;
}

const LOCATIONS_WINDOW_HOURS = 24;

/**
 * Recent page views with a resolved lat/lng, collapsed to one point per
 * ~11km cell (1 decimal degree) so repeat visits from the same city don't
 * draw a separate dot each time. Powers the globe on /admin/analytics.
 * Geolocation only exists on Vercel in production (see middleware.ts), so
 * this is empty in local dev.
 */
export async function getRecentViewerLocations(limit = 500): Promise<ViewerLocation[]> {
  const supabase = getSupabaseServerClient();
  const since = new Date(Date.now() - LOCATIONS_WINDOW_HOURS * 60 * 60 * 1000).toISOString();

  const { data, error } = await supabase
    .from("events")
    .select("city, country, latitude, longitude")
    .eq("event_type", "page_view")
    .not("latitude", "is", null)
    .not("longitude", "is", null)
    .gte("created_at", since)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw new Error(`getRecentViewerLocations: ${error.message}`);
  const rows = (data ?? []) as { city: string | null; country: string | null; latitude: number; longitude: number }[];

  const byCell = new Map<string, ViewerLocation>();
  for (const row of rows) {
    const key = `${row.latitude.toFixed(1)},${row.longitude.toFixed(1)}`;
    const existing = byCell.get(key);
    if (existing) {
      existing.count += 1;
    } else {
      byCell.set(key, { city: row.city, country: row.country, latitude: row.latitude, longitude: row.longitude, count: 1 });
    }
  }

  return Array.from(byCell.values()).sort((a, b) => b.count - a.count);
}

/**
 * Aggregates the events table for /admin/analytics — a fixed 30-day window,
 * fetched in one query and summarized in memory. Fine at this app's current
 * event volume; if `events` grows large enough for this to matter, move the
 * aggregation into SQL (a view or an RPC function) instead of paginating
 * this query.
 */
export async function getAnalyticsSummary(): Promise<AnalyticsSummary> {
  const supabase = getSupabaseServerClient();
  const since = windowStartIso();

  const { data, error } = await supabase
    .from("events")
    .select("event_type, session_id, utm_source, referrer, metadata")
    .gte("created_at", since);

  if (error) throw new Error(`getAnalyticsSummary: ${error.message}`);
  const events = (data ?? []) as EventRow[];

  const uniqueSessions = new Set(events.map((e) => e.session_id)).size;
  const signups = events.filter((e) => e.event_type === "signup").length;
  const checkoutsCompleted = events.filter((e) => e.event_type === "checkout_completed").length;
  const conversionRate = signups > 0 ? (checkoutsCompleted / signups) * 100 : null;

  const pageViews = events.filter((e) => e.event_type === "page_view");
  const unlocks = events.filter((e) => e.event_type === "brief_unlocked");

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
}
