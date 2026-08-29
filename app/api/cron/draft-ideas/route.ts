import { NextResponse } from "next/server";
import { runDraftPass } from "@/lib/ingest/run-draft-pass";
import { isAuthorizedCronRequest } from "@/lib/ingest/require-cron";

export const maxDuration = 120;
export const dynamic = "force-dynamic";

/**
 * A2 (cluster) -> A3 (draft) pass. Runs after the four ingest-* crons have
 * had a chance to populate raw_signals — see vercel.json for the stagger.
 */
export async function GET(request: Request) {
  if (!isAuthorizedCronRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await runDraftPass();
  return NextResponse.json(result);
}
