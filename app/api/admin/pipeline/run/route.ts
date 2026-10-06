import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/require-admin";
import { isPollerId, runPoller } from "@/lib/ingest/poller-registry";
import { runDraftPass } from "@/lib/ingest/run-draft-pass";
import {
  canRunDraftInline,
  enqueueDraftJob,
  getLatestDraftJob,
  getPipelineJob,
} from "@/lib/ingest/pipeline-jobs-repository";

// Discourse alone needs ~4-5 min (25 forums, 1s throttle), same as its cron.
export const maxDuration = 280;
export const dynamic = "force-dynamic";

async function adminGate(): Promise<NextResponse | null> {
  const check = await requireAdmin();
  if (check.ok === false) {
    return NextResponse.json(
      { error: check.status === 401 ? "Unauthorized" : "Forbidden" },
      { status: check.status },
    );
  }
  return null;
}

/**
 * POST /api/admin/pipeline/run — admin-triggered ingest pipeline stages.
 *
 *   { stage: "poll", source: "<poller id>" }  one poller -> raw_signals
 *   { stage: "draft" }                        classify -> cluster -> draft pass
 *
 * One stage per request so each call stays inside maxDuration; the banner
 * chains them for "run everything". The draft stage needs local Ollama, so
 * where that's unreachable (Vercel) it's enqueued in pipeline_jobs for the
 * falcon worker and the response is { queued: true, job } instead.
 */
export async function POST(request: Request) {
  const denied = await adminGate();
  if (denied) return denied;

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
      if (!canRunDraftInline()) {
        return NextResponse.json({ queued: true, job: await enqueueDraftJob("admin") });
      }
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

/**
 * GET /api/admin/pipeline/run?job=<id|latest> — status of a queued draft
 * job, polled by the banner while the falcon worker runs it.
 */
export async function GET(request: Request) {
  const denied = await adminGate();
  if (denied) return denied;

  const jobParam = new URL(request.url).searchParams.get("job");
  if (!jobParam) {
    return NextResponse.json({ error: "Missing job parameter" }, { status: 400 });
  }

  try {
    const job = jobParam === "latest" ? await getLatestDraftJob() : await getPipelineJob(jobParam);
    if (!job && jobParam !== "latest") {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }
    return NextResponse.json({ job });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 502 },
    );
  }
}
