import "server-only";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { referrerLabel } from "@/lib/analytics/queries";
import { deviceLabel } from "@/lib/analytics/device";

export type LiveWindow = "24h" | "live";

export interface LivePoint {
  city: string | null;
  country: string | null;
  lat: number;
  lng: number;
  sessions: number;
  activeNow: number;
}

export interface LiveTotals {
  activeNow: number;
  sessions: number;
  countries: number;
  avgSessionSeconds: number;
}

export interface LiveAnalytics {
  points: LivePoint[];
  totals: LiveTotals;
  topPages: { path: string; views: number }[];
  referrers: { source: string; sessions: number }[];
  devices: { label: string; sessions: number }[];
  recent: { city: string | null; country: string | null; path: string | null; secondsAgo: number }[];
}

const ACTIVE_NOW_MINUTES = 5;
const RECENT_FEED_LIMIT = 20;
const PAGE_SIZE = 1000;

interface PageViewRow {
  session_id: string;
  path: string | null;
  referrer: string | null;
  city: string | null;
  country: string | null;
  latitude: number | null;
  longitude: number | null;
  user_agent: string | null;
  created_at: string;
}

/**
 * Paged `page_view` fetch since a timestamp, oldest first. Mirrors
 * fetchEventsSince in queries.ts — PostgREST caps an unbounded select at its
 * max-rows setting, so this pages until a short page comes back.
 */
async function fetchPageViewsSince(since: string): Promise<PageViewRow[]> {
  const supabase = getSupabaseServerClient();
  const rows: PageViewRow[] = [];

  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await supabase
      .from("events")
      .select("session_id, path, referrer, city, country, latitude, longitude, user_agent, created_at")
      .eq("event_type", "page_view")
      .gte("created_at", since)
      .order("created_at", { ascending: true })
      .range(from, from + PAGE_SIZE - 1);

    if (error) throw new Error(`getLiveAnalytics: ${error.message}`);

    const page = (data ?? []) as PageViewRow[];
    rows.push(...page);
    if (page.length < PAGE_SIZE) return rows;
  }
}

async function countActiveNowSessions(): Promise<number> {
  const since = new Date(Date.now() - ACTIVE_NOW_MINUTES * 60 * 1000).toISOString();
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("events")
    .select("session_id")
    .eq("event_type", "page_view")
    .gte("created_at", since)
    .limit(PAGE_SIZE);

  if (error) throw new Error(`getLiveAnalytics: ${error.message}`);
  return new Set((data ?? []).map((r) => (r as { session_id: string }).session_id)).size;
}

function countBy<T>(items: T[], key: (row: T) => string): Map<string, number> {
  const counts = new Map<string, number>();
  for (const item of items) {
    const k = key(item);
    counts.set(k, (counts.get(k) ?? 0) + 1);
  }
  return counts;
}

function topN(counts: Map<string, number>, n: number): [string, number][] {
  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, n);
}

function averageSessionSeconds(rows: PageViewRow[]): number {
  const bySession = new Map<string, { min: number; max: number; hits: number }>();
  for (const row of rows) {
    const t = new Date(row.created_at).getTime();
    const existing = bySession.get(row.session_id);
    if (existing) {
      existing.min = Math.min(existing.min, t);
      existing.max = Math.max(existing.max, t);
      existing.hits += 1;
    } else {
      bySession.set(row.session_id, { min: t, max: t, hits: 1 });
    }
  }

  const durations = Array.from(bySession.values())
    .filter((s) => s.hits >= 2)
    .map((s) => (s.max - s.min) / 1000);

  if (durations.length === 0) return 0;
  return Math.round(durations.reduce((a, b) => a + b, 0) / durations.length);
}

/**
 * Full data contract for /admin/analytics/live (points, totals, breakdowns,
 * live session feed), aggregated from `events` in memory — same tradeoff as
 * getAnalyticsSummary. `window` is `"24h"` or `"live"` (last 5 minutes).
 */
export async function getLiveAnalytics(window: LiveWindow): Promise<LiveAnalytics> {
  const since =
    window === "24h"
      ? new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
      : new Date(Date.now() - ACTIVE_NOW_MINUTES * 60 * 1000).toISOString();

  const [rows, activeNow] = await Promise.all([fetchPageViewsSince(since), countActiveNowSessions()]);

  const activeSince = new Date(Date.now() - ACTIVE_NOW_MINUTES * 60 * 1000).getTime();

  const byCell = new Map<string, LivePoint & { sessionIds: Set<string>; activeSessionIds: Set<string> }>();
  for (const row of rows) {
    if (row.latitude == null || row.longitude == null) continue;
    const key = `${row.latitude.toFixed(1)},${row.longitude.toFixed(1)}`;
    let cell = byCell.get(key);
    if (!cell) {
      cell = {
        city: row.city,
        country: row.country,
        lat: row.latitude,
        lng: row.longitude,
        sessions: 0,
        activeNow: 0,
        sessionIds: new Set(),
        activeSessionIds: new Set(),
      };
      byCell.set(key, cell);
    }
    cell.sessionIds.add(row.session_id);
    if (new Date(row.created_at).getTime() >= activeSince) cell.activeSessionIds.add(row.session_id);
  }
  const points: LivePoint[] = Array.from(byCell.values())
    .map((cell) => ({
      city: cell.city,
      country: cell.country,
      lat: cell.lat,
      lng: cell.lng,
      sessions: cell.sessionIds.size,
      activeNow: cell.activeSessionIds.size,
    }))
    .sort((a, b) => b.sessions - a.sessions);

  const sessions = new Set(rows.map((r) => r.session_id)).size;
  const countries = new Set(rows.map((r) => r.country).filter((c): c is string => Boolean(c))).size;
  const avgSessionSeconds = averageSessionSeconds(rows);

  const topPages = topN(
    countBy(rows, (r) => r.path ?? "(unknown)"),
    8,
  ).map(([path, views]) => ({ path, views }));

  const referrers = topN(
    countBy(rows, (r) => referrerLabel(r.referrer)),
    8,
  ).map(([source, count]) => ({ source, sessions: count }));

  const devices = topN(
    countBy(rows, (r) => deviceLabel(r.user_agent)),
    8,
  ).map(([label, count]) => ({ label, sessions: count }));

  const now = Date.now();
  const recent = rows
    .slice(-RECENT_FEED_LIMIT)
    .reverse()
    .map((r) => ({
      city: r.city,
      country: r.country,
      path: r.path,
      secondsAgo: Math.max(0, Math.round((now - new Date(r.created_at).getTime()) / 1000)),
    }));

  return {
    points,
    totals: { activeNow, sessions, countries, avgSessionSeconds },
    topPages,
    referrers,
    devices,
    recent,
  };
}
