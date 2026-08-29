import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/current-user";
import { getSessionId, track } from "@/lib/track";

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
    metadata: (body?.metadata as Record<string, unknown> | undefined) ?? {},
  });

  return NextResponse.json({ ok: true });
}
