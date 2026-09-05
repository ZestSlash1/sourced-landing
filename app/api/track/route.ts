import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/current-user";
import { getSessionId, track } from "@/lib/track";
import { OPT_OUT_COOKIE, isExcludedTraffic } from "@/lib/analytics/exclusion";
import { cookies, headers } from "next/headers";

import { checkRateLimit } from "@/lib/security/rate-limit";
import { clientIp } from "@/lib/analytics/exclusion";

export const dynamic = "force-dynamic";

const ALLOWED_EVENT_TYPES = new Set([
  "page_view",
  "signup",
  "brief_unlocked",
  "checkout_started",
  "checkout_completed",
  "topic_updated",
  "oauth_login",
  "quota_exhausted",
  "export_accessed",
]);

/**
 * POST /api/track — the one write path into `events`, hit from two places:
 * middleware.ts (page views, via `event.waitUntil` so it can't add
 * latency), and client components that need to record something that
 * happens entirely in the browser (e.g. signup, since that's a direct
 * Supabase Auth call with no server route of its own). Always resolves
 * `user_id` server-side from the request's own auth cookie rather than
 * trusting the client to supply it.
 */
export async function POST(request: Request) {
  const ip = clientIp(headers()) ?? "unknown";
  const rateLimit = checkRateLimit(`track:${ip}`, 60, 60_000);
  if (!rateLimit.success) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  const eventType = typeof body?.eventType === "string" ? body.eventType : null;
  if (!eventType || !ALLOWED_EVENT_TYPES.has(eventType)) {
    return NextResponse.json({ error: "Invalid or missing eventType" }, { status: 400 });
  }

  // Cap metadata payload to prevent unbounded storage abuse
  const rawMetadata = body?.metadata;
  let safeMetadata: Record<string, unknown> = {};
  if (rawMetadata && typeof rawMetadata === "object") {
    try {
      const stringified = JSON.stringify(rawMetadata);
      if (stringified.length <= 2048) {
        safeMetadata = rawMetadata as Record<string, unknown>;
      }
    } catch {
      safeMetadata = {};
    }
  }

  // Checked here as well as in middleware.ts: client-fired events (e.g.
  // signup, via lib/track-client.ts) POST straight to this route, so the
  // middleware's own-traffic check never sees them.
  if (isExcludedTraffic(headers(), Boolean(cookies().get(OPT_OUT_COOKIE)?.value))) {
    return NextResponse.json({ ok: true, excluded: true });
  }

  const sessionId = (typeof body?.sessionId === "string" && body.sessionId) || getSessionId();
  if (!sessionId) {
    // No "sid" cookie on this request — nothing to attribute the event to.
    return NextResponse.json({ ok: true });
  }

  const user = await getCurrentUser();

  await track({
    eventType,
    sessionId,
    userId: user?.id ?? null,
    path: typeof body?.path === "string" ? body.path : null,
    referrer: typeof body?.referrer === "string" ? body.referrer : null,
    utmSource: typeof body?.utmSource === "string" ? body.utmSource : null,
    utmMedium: typeof body?.utmMedium === "string" ? body.utmMedium : null,
    utmCampaign: typeof body?.utmCampaign === "string" ? body.utmCampaign : null,
    country: typeof body?.country === "string" ? body.country : null,
    city: typeof body?.city === "string" ? body.city : null,
    latitude: typeof body?.latitude === "number" ? body.latitude : null,
    longitude: typeof body?.longitude === "number" ? body.longitude : null,
    userAgent: typeof body?.userAgent === "string" ? body.userAgent : headers().get("user-agent"),
    metadata: safeMetadata,
  });

  return NextResponse.json({ ok: true });
}
