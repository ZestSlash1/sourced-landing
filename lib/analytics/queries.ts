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

export function referrerLabel(referrer: string | null): string {
  if (!referrer) return "(direct)";
  try {
    return new URL(referrer).hostname || referrer;
  } catch {
    return referrer;
  }
}

/** Rows per request when paging `events`. Must stay <= PostgREST's max-rows. */
const PAGE_SIZE = 1000;

/**
 * Every event in the window, paged. PostgREST caps an unbounded `select()`
 * at its `max-rows` setting (1000 by default) and returns the truncated set
 * *without* an error, so a single query silently under-reports every number
 * on the dashboard the moment the window holds more than that. Paging until
 * a short page comes back is what keeps the totals honest.
 */
async function fetchEventsSince(since: string): Promise<EventRow[]> {
  const supabase = getSupabaseServerClient();
  const events: EventRow[] = [];

  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await supabase
      .from("events")
      .select("event_type, session_id, utm_source, referrer, metadata")
      .gte("created_at", since)
      .order("created_at", { ascending: true })
      .range(from, from + PAGE_SIZE - 1);

    if (error) throw new Error(`getAnalyticsSummary: ${error.message}`);

    const page = (data ?? []) as EventRow[];
    events.push(...page);
    if (page.length < PAGE_SIZE) return events;
  }
}

/**
 * Aggregates the events table for /admin/analytics — a fixed 30-day window,
 * summarized in memory. Fine at this app's current event volume; if `events`
 * grows large enough for the paging above to get slow, move the aggregation
 * into SQL (a view or an RPC function).
 */
export async function getAnalyticsSummary(): Promise<AnalyticsSummary> {
  const events = await fetchEventsSince(windowStartIso());

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
