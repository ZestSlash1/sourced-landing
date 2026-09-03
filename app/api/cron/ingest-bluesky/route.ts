import { NextResponse } from "next/server";
import { pollBluesky } from "@/lib/ingest/pollers/bluesky";
import { insertRawSignals } from "@/lib/ingest/raw-signals-repository";
import { isAuthorizedCronRequest } from "@/lib/ingest/require-cron";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!isAuthorizedCronRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { signals, noiseFiltered } = await pollBluesky();
  const inserted = await insertRawSignals(signals);
  return NextResponse.json({ fetched: signals.length, noiseFiltered, inserted });
}
