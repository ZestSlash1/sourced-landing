"use client";

declare global {
  interface Window {
    umami?: { track: (eventName: string, data?: Record<string, unknown>) => void };
  }
}

/**
 * Client-side counterpart to lib/track.ts, for events that only happen in
 * the browser (e.g. signup, which is a direct Supabase Auth call with no
 * server route of its own). Fire-and-forget: never awaited by callers, and
 * any failure is silently dropped — see lib/track.ts for why.
 *
 * Also mirrors the event to Umami (window.umami, injected by the script tag
 * in app/layout.tsx) when it's present, so pageview-adjacent funnel events
 * show up there without a second call site at every caller.
 */
export function trackEvent(eventType: string, metadata?: Record<string, unknown>): void {
  fetch("/api/track", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ eventType, metadata, path: window.location.pathname }),
    keepalive: true,
  }).catch(() => {});

  try {
    window.umami?.track(eventType, metadata);
  } catch {
    // Umami not loaded or misconfigured — never let this break the caller.
  }
}
