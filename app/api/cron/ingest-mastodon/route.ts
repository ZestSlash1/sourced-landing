import { NextResponse } from "next/server";
import { pollMastodon } from "@/lib/ingest/pollers/mastodon";
import { insertRawSignals } from "@/lib/ingest/raw-signals-repository";
import { isAuthorizedCronRequest } from "@/lib/ingest/require-cron";

// Throttled to ~1 req/sec across instances x hashtags (poller-sources.ts),
// past the other ingest-* routes' 60s default.
export const maxDuration = 120;
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!isAuthorizedCronRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { signals, noiseFiltered } = await pollMastodon();
  const inserted = await insertRawSignals(signals);
  return NextResponse.json({ fetched: signals.length, noiseFiltered, inserted });
}
