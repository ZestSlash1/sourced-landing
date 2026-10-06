/**
 * Falcon-side worker for the pipeline_jobs queue. Vercel can't reach local
 * Ollama/OmniRoute, so the admin banner's "Run draft pass" and the daily
 * draft-ideas cron only enqueue a job there; this process claims queued jobs
 * and runs runDraftPass() here, where the LLMs are. No function timeout
 * applies, so a pass can take as long as classification needs.
 *
 *   npm run worker
 *
 * Ctrl+C once finishes the current job then exits; twice exits immediately.
 */
import { config } from "dotenv";
config({ path: ".env.local" });

// Bypass "server-only" for standalone tsx execution
const serverOnlyPath = require.resolve("server-only");
require.cache[serverOnlyPath] = {
  id: serverOnlyPath,
  filename: serverOnlyPath,
  loaded: true,
  exports: {},
} as any;

const POLL_INTERVAL_MS = 15_000;

type JobsRepo = typeof import("../lib/ingest/pipeline-jobs-repository");

let busy = false;
let stopping = false;

process.on("SIGINT", () => {
  if (!busy || stopping) process.exit(0);
  stopping = true;
  console.log("\n[worker] finishing the current job, then exiting (Ctrl+C again to abort now)");
});

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Jobs left in "running" by a worker that crashed or was killed mid-pass.
 * Nothing will ever finish them, and enqueueDraftJob treats a running job
 * as active — so until they're resolved, new draft requests just get handed
 * the dead job back.
 */
async function recoverOrphanedJobs(repo: JobsRepo): Promise<void> {
  const orphans = await repo.listRunningJobs();
  if (orphans.length === 0) return;
  // TODO(human): decide what happens to each orphaned job — see repo.requeueJob / repo.finishJob.
}

async function main() {
  const repo = await import("../lib/ingest/pipeline-jobs-repository");
  const { runDraftPass } = await import("../lib/ingest/run-draft-pass");

  if (!repo.canRunDraftInline()) {
    throw new Error("OLLAMA_URL is not set — the worker has to run where local Ollama is reachable (falcon).");
  }

  await recoverOrphanedJobs(repo);
  console.log(`[worker] polling pipeline_jobs every ${POLL_INTERVAL_MS / 1000}s`);

  while (!stopping) {
    let job: Awaited<ReturnType<JobsRepo["claimNextJob"]>> = null;
    try {
      job = await repo.claimNextJob();
    } catch (err) {
      console.error("[worker] claim failed:", err instanceof Error ? err.message : err);
    }
    if (!job) {
      await sleep(POLL_INTERVAL_MS);
      continue;
    }

    busy = true;
    const started = Date.now();
    console.log(`[worker] job ${job.id} (requested by ${job.requestedBy ?? "unknown"}) — running draft pass`);
    try {
      const result = await runDraftPass();
      await repo.finishJob(job.id, { result });
      console.log(
        `[worker] job ${job.id} done in ${Math.round((Date.now() - started) / 1000)}s — ` +
          `${result.drafted} drafted, ${result.clustersPassingBar} clusters passed`,
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`[worker] job ${job.id} failed:`, message);
      await repo.finishJob(job.id, { error: message }).catch((e) =>
        console.error("[worker] could not record failure:", e instanceof Error ? e.message : e),
      );
    } finally {
      busy = false;
    }
  }
}

main().catch((err) => {
  console.error("[worker] fatal:", err instanceof Error ? err.message : err);
  process.exit(1);
});
