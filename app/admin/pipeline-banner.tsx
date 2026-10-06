"use client";

import { useEffect, useRef, useState } from "react";
import { POLLER_LIST } from "@/lib/ingest/poller-ids";

type StepState = "idle" | "running" | "done" | "error";

interface Step {
  state: StepState;
  detail?: string;
}

/** Client view of a pipeline_jobs row (see lib/ingest/pipeline-jobs-repository.ts). */
interface DraftJob {
  id: string;
  status: "queued" | "running" | "done" | "error";
  result: Record<string, unknown> | null;
  error: string | null;
  createdAt: string;
  startedAt: string | null;
}

const POLL_ALL = "poll-all";
const DRAFT = "draft";
const JOB_POLL_MS = 5_000;
// A queued job the worker hasn't claimed within this long most likely means
// the worker isn't running on falcon.
const WORKER_HINT_AFTER_MS = 45_000;

const RUN_URL = "/api/admin/pipeline/run";

async function readJson(res: Response): Promise<Record<string, unknown>> {
  const json = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) throw new Error(typeof json.error === "string" ? json.error : `HTTP ${res.status}`);
  return json;
}

async function callStage(body: Record<string, unknown>): Promise<Record<string, unknown>> {
  return readJson(
    await fetch(RUN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
  );
}

async function fetchJob(job: string): Promise<DraftJob | null> {
  const json = await readJson(await fetch(`${RUN_URL}?job=${encodeURIComponent(job)}`, { cache: "no-store" }));
  return (json.job as DraftJob | null) ?? null;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function elapsed(since: string): string {
  const s = Math.max(0, Math.round((Date.now() - Date.parse(since)) / 1000));
  return s >= 60 ? `${Math.floor(s / 60)}m ${s % 60}s` : `${s}s`;
}

function describeActiveJob(job: DraftJob): string {
  if (job.status === "running") return `running on falcon… ${elapsed(job.startedAt ?? job.createdAt)}`;
  return Date.now() - Date.parse(job.createdAt) > WORKER_HINT_AFTER_MS
    ? `queued ${elapsed(job.createdAt)} — is \`npm run worker\` running on falcon?`
    : "queued — waiting for the falcon worker";
}

function summarizePoll(r: Record<string, unknown>): string {
  return `${r.inserted} new · ${r.fetched} fetched`;
}

function summarizeDraft(r: Record<string, unknown>): string {
  const errors = Array.isArray(r.errors) ? r.errors.length : 0;
  return `${r.drafted} drafted · ${r.clustersPassingBar} clusters passed${errors ? ` · ${errors} errors` : ""}`;
}

/**
 * Pipeline control banner shown at the top of every admin page. Each button
 * calls POST /api/admin/pipeline/run one stage at a time; "Run full pipeline"
 * chains poll-all -> draft from the browser so no single request has to
 * outlive the function timeout. On Vercel the draft stage comes back queued
 * for the falcon worker, and the banner polls the job until it finishes —
 * including after navigating between admin pages, since each page remounts it.
 */
export default function PipelineBanner() {
  const [steps, setSteps] = useState<Record<string, Step>>({});
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(false);
  const unmounted = useRef(false);

  const set = (key: string, step: Step) => setSteps((prev) => ({ ...prev, [key]: step }));

  /** Polls a queued/running draft job until it settles. Resolves true on success. */
  async function followJob(initial: DraftJob): Promise<boolean> {
    let job: DraftJob | null = initial;
    let failedPolls = 0;
    while (job && (job.status === "queued" || job.status === "running")) {
      set(DRAFT, { state: "running", detail: describeActiveJob(job) });
      await sleep(JOB_POLL_MS);
      if (unmounted.current) return false;
      try {
        job = await fetchJob(job.id);
        failedPolls = 0;
      } catch (err) {
        // A flaky poll shouldn't abandon a job that's still running on falcon.
        if (++failedPolls >= 3) {
          set(DRAFT, { state: "error", detail: `lost track of job: ${err instanceof Error ? err.message : err}` });
          return false;
        }
      }
    }
    if (!job) {
      set(DRAFT, { state: "error", detail: "job disappeared" });
      return false;
    }
    if (job.status === "error") {
      set(DRAFT, { state: "error", detail: job.error ?? "failed on falcon" });
      return false;
    }
    set(DRAFT, { state: "done", detail: job.result ? summarizeDraft(job.result) : "done" });
    return true;
  }

  useEffect(() => {
    unmounted.current = false;
    // Pick back up a draft job started from another admin page (or by the cron).
    fetchJob("latest")
      .then(async (job) => {
        if (unmounted.current || !job || (job.status !== "queued" && job.status !== "running")) return;
        setBusy(true);
        try {
          await followJob(job);
        } finally {
          if (!unmounted.current) setBusy(false);
        }
      })
      .catch(() => {});
    return () => {
      unmounted.current = true;
    };
  }, []);

  async function runPoll(id: string): Promise<boolean> {
    set(id, { state: "running" });
    try {
      set(id, { state: "done", detail: summarizePoll(await callStage({ stage: "poll", source: id })) });
      return true;
    } catch (err) {
      set(id, { state: "error", detail: err instanceof Error ? err.message : String(err) });
      return false;
    }
  }

  async function runPollAll(): Promise<void> {
    set(POLL_ALL, { state: "running" });
    const failed: string[] = [];
    for (const { id, label } of POLLER_LIST) {
      if (!(await runPoll(id))) failed.push(label);
    }
    set(POLL_ALL, {
      state: failed.length === POLLER_LIST.length ? "error" : "done",
      detail: failed.length
        ? `${failed.length} of ${POLLER_LIST.length} sources failed (${failed.join(", ")})`
        : "all sources polled",
    });
  }

  async function runDraft(): Promise<boolean> {
    set(DRAFT, { state: "running" });
    try {
      const res = await callStage({ stage: "draft" });
      if (res.queued) return await followJob(res.job as DraftJob);
      set(DRAFT, { state: "done", detail: summarizeDraft(res) });
      return true;
    } catch (err) {
      set(DRAFT, { state: "error", detail: err instanceof Error ? err.message : String(err) });
      return false;
    }
  }

  async function guard(fn: () => Promise<unknown>) {
    if (busy) return;
    setBusy(true);
    try {
      await fn();
    } finally {
      setBusy(false);
    }
  }

  const pollAll = steps[POLL_ALL];
  const draft = steps[DRAFT];

  return (
    <section className="pipeline-banner" aria-label="Ingest pipeline controls">
      <div className="pipeline-banner-row">
        <div>
          <div className="pipeline-banner-title display">Ingest pipeline</div>
          <div className="mono pipeline-banner-sub">poll sources → classify → cluster → draft for review</div>
        </div>
        <div className="pipeline-banner-actions">
          <button
            className="admin-btn admin-btn-ghost"
            disabled={busy}
            onClick={() => guard(runPollAll)}
          >
            {pollAll?.state === "running" ? "Polling…" : "Poll all sources"}
          </button>
          <button className="admin-btn admin-btn-ghost" disabled={busy} onClick={() => guard(runDraft)}>
            {draft?.state === "running" ? "Drafting…" : "Run draft pass"}
          </button>
          <button
            className="admin-btn admin-btn-primary"
            disabled={busy}
            onClick={() =>
              guard(async () => {
                await runPollAll();
                await runDraft();
              })
            }
          >
            {busy ? "Running…" : "Run full pipeline"}
          </button>
          <button
            className="admin-btn admin-btn-ghost"
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
          >
            {open ? "Hide sources" : "Sources"}
          </button>
        </div>
      </div>

      {(pollAll || draft) && (
        <div className="pipeline-status mono" role="status">
          {pollAll && (
            <span className={`pipeline-pill is-${pollAll.state}`}>
              poll: {pollAll.state === "running" ? "running…" : pollAll.detail}
            </span>
          )}
          {draft && (
            <span className={`pipeline-pill is-${draft.state}`}>
              draft: {draft.state === "running" ? draft.detail ?? "running… (can take a few minutes)" : draft.detail}
            </span>
          )}
        </div>
      )}

      {open && (
        <div className="pipeline-sources">
          {POLLER_LIST.map(({ id, label }) => {
            const s = steps[id];
            return (
              <button
                key={id}
                className={`pipeline-source is-${s?.state ?? "idle"}`}
                disabled={busy}
                title={s?.detail}
                onClick={() => guard(() => runPoll(id))}
              >
                <span>{label}</span>
                <span className="mono pipeline-source-detail">
                  {s?.state === "running" ? "…" : s?.detail ?? "run"}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </section>
  );
}
