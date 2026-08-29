"use client";

/**
 * Client-side counterpart to lib/track.ts, for events that only happen in
 * the browser (e.g. signup, which is a direct Supabase Auth call with no
 * server route of its own). Fire-and-forget: never awaited by callers, and
 * any failure is silently dropped — see lib/track.ts for why.
 */
export function trackEvent(eventType: string, metadata?: Record<string, unknown>): void {
  fetch("/api/track", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ eventType, metadata, path: window.location.pathname }),
    keepalive: true,
  }).catch(() => {});
}
