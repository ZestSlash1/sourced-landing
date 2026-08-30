/**
 * Keeps your own traffic out of the `events` table — the analytics numbers
 * and the globe on /admin/analytics should reflect real visitors, not the
 * owner reloading their own site.
 *
 * Two independent mechanisms, checked in middleware.ts (page views) and in
 * POST /api/track (client-fired events, which don't pass through the
 * middleware check):
 *
 *  1. The opt-out cookie, set by visiting GET /api/track/opt-out. Survives
 *     IP changes, but only covers the one browser it was set in.
 *  2. ANALYTICS_EXCLUDED_IPS, a comma-separated env var. Covers every
 *     browser on a machine or network at once, but a residential IP is
 *     usually dynamic, so it goes stale.
 *
 * Deliberately edge-safe: no `server-only`, no Node built-ins, so
 * middleware.ts can import it.
 */

/** Cookie marking this browser's traffic as internal. Set by GET /api/track/opt-out. */
export const OPT_OUT_COOKIE = "no_track";

/** Ten years — this is a "never count me again" switch, not a session flag. */
export const OPT_OUT_MAX_AGE_SECONDS = 60 * 60 * 24 * 365 * 10;

function excludedIps(): string[] {
  return (process.env.ANALYTICS_EXCLUDED_IPS ?? "")
    .split(",")
    .map((ip) => ip.trim())
    .filter(Boolean);
}

/**
 * The visitor's IP as seen through Vercel's proxy. `x-forwarded-for` is a
 * chain — the client is the first entry, the rest are proxies.
 */
export function clientIp(headers: Headers): string | null {
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0].trim();
    if (first) return first;
  }
  return headers.get("x-real-ip");
}

/** Whether this request's events should be dropped rather than recorded. */
export function isExcludedTraffic(headers: Headers, hasOptOutCookie: boolean): boolean {
  if (hasOptOutCookie) return true;

  const ip = clientIp(headers);
  return ip !== null && excludedIps().includes(ip);
}
