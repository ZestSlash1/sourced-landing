import { NextResponse } from "next/server";
import { pollDiscourse } from "@/lib/ingest/pollers/discourse";
import { insertRawSignals } from "@/lib/ingest/raw-signals-repository";
import { isAuthorizedCronRequest } from "@/lib/ingest/require-cron";

// Throttled to ~1 req/sec per instance across 11 instances x (1 + 8 topics)
// requests (poller-sources.ts), well past the other ingest-* routes' 60s.
export const maxDuration = 280;
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!isAuthorizedCronRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { signals, noiseFiltered } = await pollDiscourse();
  const inserted = await insertRawSignals(signals);
  return NextResponse.json({ fetched: signals.length, noiseFiltered, inserted });
}
