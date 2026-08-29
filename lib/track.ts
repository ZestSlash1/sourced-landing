import "server-only";
import { cookies } from "next/headers";
import { getSupabaseServerClient } from "@/lib/supabase/server";

/** Anonymous session cookie, set on first visit in middleware.ts. */
export const SESSION_COOKIE = "sid";

/** The current request's anonymous session id, or null if middleware hasn't set one yet. */
export function getSessionId(): string | null {
  return cookies().get(SESSION_COOKIE)?.value ?? null;
}

export interface TrackInput {
  eventType: string;
  // Falls back to the "sid" cookie on the current request. Pass explicitly
  // only where there is no browser request to read a cookie from, e.g. the
  // Razorpay webhook.
  sessionId?: string | null;
  userId?: string | null;
  path?: string | null;
  referrer?: string | null;
  utmSource?: string | null;
  utmMedium?: string | null;
  utmCampaign?: string | null;
  metadata?: Record<string, unknown>;
}

/**
 * Records one analytics event. Never throws — a tracking failure must never
 * break the request it's attached to, so every error is logged and
 * swallowed here rather than surfaced to the caller.
 */
export async function track(input: TrackInput): Promise<void> {
  try {
    const sessionId = input.sessionId ?? getSessionId();
    if (!sessionId) return;

    const supabase = getSupabaseServerClient();
    const { error } = await supabase.from("events").insert({
      event_type: input.eventType,
      session_id: sessionId,
      user_id: input.userId ?? null,
      path: input.path ?? null,
      referrer: input.referrer ?? null,
      utm_source: input.utmSource ?? null,
      utm_medium: input.utmMedium ?? null,
      utm_campaign: input.utmCampaign ?? null,
      metadata: input.metadata ?? {},
    });

    if (error) console.error(`track(${input.eventType}): ${error.message}`);
  } catch (err) {
    console.error(`track(${input.eventType}): unexpected error`, err);
  }
}
