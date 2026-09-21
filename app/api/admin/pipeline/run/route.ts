import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/require-admin";
import { isPollerId, runPoller } from "@/lib/ingest/poller-registry";
import { runDraftPass } from "@/lib/ingest/run-draft-pass";

export const maxDuration = 120;
export const dynamic = "force-dynamic";

/**
 * POST /api/admin/pipeline/run — admin-triggered ingest pipeline stages.
 *
 *   { stage: "poll", source: "<poller id>" }  one poller -> raw_signals
 *   { stage: "draft" }                        classify -> cluster -> draft pass
 *
 * One stage per request so each call stays inside maxDuration; the banner
 * chains them for "run everything". The draft stage needs the same local
 * Ollama/OmniRoute the cron does, so it only succeeds where those are reachable.
 */
export async function POST(request: Request) {
  const check = await requireAdmin();
  if (check.ok === false) {
    return NextResponse.json(
      { error: check.status === 401 ? "Unauthorized" : "Forbidden" },
      { status: check.status },
    );
  }

  let body: { stage?: unknown; source?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  try {
    if (body.stage === "poll") {
      if (!isPollerId(body.source)) {
        return NextResponse.json({ error: "Unknown source" }, { status: 400 });
      }
      return NextResponse.json(await runPoller(body.source));
    }
    if (body.stage === "draft") {
      return NextResponse.json(await runDraftPass());
    }
    return NextResponse.json({ error: "Unknown stage" }, { status: 400 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 502 },
    );
  }
}
