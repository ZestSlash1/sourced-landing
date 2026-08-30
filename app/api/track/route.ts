import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/current-user";
import { getSessionId, track } from "@/lib/track";
import { OPT_OUT_COOKIE, isExcludedTraffic } from "@/lib/analytics/exclusion";
import { cookies, headers } from "next/headers";

export const dynamic = "force-dynamic";

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
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  const eventType = typeof body?.eventType === "string" ? body.eventType : null;
  if (!eventType) {
    return NextResponse.json({ error: "eventType is required" }, { status: 400 });
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
    metadata: (body?.metadata as Record<string, unknown> | undefined) ?? {},
  });

  return NextResponse.json({ ok: true });
}
