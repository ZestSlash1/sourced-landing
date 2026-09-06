import { NextResponse } from "next/server";
import { isAuthorizedCronRequest } from "@/lib/ingest/require-cron";
import { listPublishedIdeas } from "@/lib/idea-drops/repository";
import { dispatchWeeklyDrop } from "@/lib/email/dispatcher";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export const maxDuration = 120;
export const dynamic = "force-dynamic";

/**
 * Weekly scheduled cron: broadcasts the latest published drop to subscribers.
 * Protected by CRON_SECRET.
 * Idempotent: verifies whether drop_broadcast_sent was already recorded for this drop.
 */
export async function GET(request: Request) {
  if (!isAuthorizedCronRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const published = await listPublishedIdeas();
  if (!published || published.length === 0) {
    return NextResponse.json({ ok: true, message: "No published drops found to broadcast." });
  }

  // Pick the most recent published drop
  const latestDrop = published[0];

  // Idempotency check: check if already broadcast
  const supabase = getSupabaseServerClient();
  const { data: existingEvents } = await supabase
    .from("events")
    .select("id")
    .eq("event_type", "drop_broadcast_sent")
    .contains("metadata", { ideaId: latestDrop.id })
    .limit(1);

  if (existingEvents && existingEvents.length > 0) {
    return NextResponse.json({
      ok: true,
      alreadyDispatched: true,
      ideaId: latestDrop.id,
      title: latestDrop.title,
    });
  }

  const result = await dispatchWeeklyDrop(latestDrop, { dryRun: false });

  return NextResponse.json({
    ok: true,
    dispatched: true,
    ideaId: latestDrop.id,
    title: latestDrop.title,
    recipientCount: result.recipientCount,
  });
}