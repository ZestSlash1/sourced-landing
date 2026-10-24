"use client";

import { useEffect, useRef, useState } from "react";
import { POLLER_LIST } from "@/lib/ingest/poller-ids";
import PipelineFlow from "./pipeline-flow";

type StepState = "idle" | "running" | "done" | "error";

interface Step {
  state: StepState;
  detail?: string;
  inserted?: number;
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
 * for the falcon worker, and the banner polls the job until it finishes.
 *
 * Vertical clutter is solved by collapsing the ~220px flow visualizer into a
 * sleek Command Bar when idle, while keeping it 1-click accessible and auto-opening
 * whenever the pipeline is active.
 */
export default function PipelineBanner() {
  const [steps, setSteps] = useState<Record<string, Step>>({});
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(false);
  const [showFlow, setShowFlow] = useState(false);
  const unmounted = useRef(false);

  const set = (key: string, step: Step) => setSteps((prev) => ({ ...prev, [key]: step }));

  /** Automatically open the flow visualizer when the pipeline becomes active */
  useEffect(() => {
    if (busy) {
      setShowFlow(true);
    }
  }, [busy]);

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
        setShowFlow(true);
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
      const res = await callStage({ stage: "poll", source: id });
      set(id, { state: "done", detail: summarizePoll(res), inserted: Number(res.inserted) || 0 });
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

  const isRunning = busy || pollAll?.state === "running" || draft?.state === "running";
  const hasError = pollAll?.state === "error" || draft?.state === "error";

  return (
    <section
      className="pipeline-banner"
      aria-label="Ingest pipeline controls"
      style={{
        background: "linear-gradient(180deg, rgba(22, 24, 36, 0.95) 0%, rgba(16, 18, 26, 0.98) 100%)",
        border: "1px solid rgba(255, 255, 255, 0.08)",
        borderLeft: "3px solid var(--violet)",
        borderRadius: "var(--r-xl)",
        boxShadow: "0 8px 30px rgba(0, 0, 0, 0.4)",
        padding: "16px 20px",
        marginBottom: 24,
      }}
    >
      {/* Sleek, compact single-row Pipeline Command Bar */}
      <div className="pipeline-banner-row" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
        {/* Left: Status dot + Title + Inline Status Pills */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                flexShrink: 0,
                background: isRunning
                  ? "var(--violet-deep)"
                  : hasError
                  ? "var(--coral-deep)"
                  : "var(--lime)",
                boxShadow: isRunning
                  ? "0 0 10px rgba(167, 139, 250, 0.9)"
                  : hasError
                  ? "0 0 8px rgba(255, 51, 102, 0.7)"
                  : "0 0 8px rgba(16, 185, 129, 0.7)",
                animation: isRunning ? "livePulse 1.2s cubic-bezier(0.4, 0, 0.6, 1) infinite" : "none",
              }}
            />
            <span className="pipeline-banner-title display" style={{ fontSize: 15, fontWeight: 700, letterSpacing: "-0.01em", margin: 0 }}>
              Ingest Pipeline
            </span>
          </div>

          <span className="mono" style={{ fontSize: 11, color: "var(--ink-soft)" }}>
            poll → classify → cluster → draft
          </span>

          {/* Compact inline status pills */}
          {(pollAll || draft) && (
            <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
              {pollAll && (
                <span
                  className="mono"
                  style={{
                    fontSize: 10.5,
                    padding: "2px 8px",
                    borderRadius: "var(--r-chip)",
                    background:
                      pollAll.state === "error"
                        ? "rgba(255, 51, 102, 0.12)"
                        : pollAll.state === "running"
                        ? "rgba(124, 58, 237, 0.16)"
                        : "rgba(16, 185, 129, 0.12)",
                    color:
                      pollAll.state === "error"
                        ? "var(--coral-deep)"
                        : pollAll.state === "running"
                        ? "var(--violet-deep)"
                        : "var(--lime)",
                    border: `1px solid ${
                      pollAll.state === "error"
                        ? "rgba(255, 51, 102, 0.3)"
                        : pollAll.state === "running"
                        ? "rgba(124, 58, 237, 0.3)"
                        : "rgba(16, 185, 129, 0.25)"
                    }`,
                  }}
                >
                  poll: {pollAll.state === "running" ? "running…" : pollAll.detail}
                </span>
              )}
              {draft && (
                <span
                  className="mono"
                  style={{
                    fontSize: 10.5,
                    padding: "2px 8px",
                    borderRadius: "var(--r-chip)",
                    background:
                      draft.state === "error"
                        ? "rgba(255, 51, 102, 0.12)"
                        : draft.state === "running"
                        ? "rgba(124, 58, 237, 0.16)"
                        : "rgba(16, 185, 129, 0.12)",
                    color:
                      draft.state === "error"
                        ? "var(--coral-deep)"
                        : draft.state === "running"
                        ? "var(--violet-deep)"
                        : "var(--lime)",
                    border: `1px solid ${
                      draft.state === "error"
                        ? "rgba(255, 51, 102, 0.3)"
                        : draft.state === "running"
                        ? "rgba(124, 58, 237, 0.3)"
                        : "rgba(16, 185, 129, 0.25)"
                    }`,
                  }}
                >
                  draft: {draft.state === "running" ? draft.detail ?? "running…" : draft.detail}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Right: Action Buttons */}
        <div className="pipeline-banner-actions" style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <button
            type="button"
            className="admin-btn admin-btn-ghost"
            style={{ fontSize: 12, padding: "6px 13px" }}
            disabled={busy}
            onClick={() => guard(runPollAll)}
          >
            {pollAll?.state === "running" ? "Polling…" : "Poll All"}
          </button>

          <button
            type="button"
            className="admin-btn admin-btn-ghost"
            style={{ fontSize: 12, padding: "6px 13px" }}
            disabled={busy}
            onClick={() => guard(runDraft)}
          >
            {draft?.state === "running" ? "Drafting…" : "Draft Pass"}
          </button>

          <button
            type="button"
            className="admin-btn admin-btn-primary"
            style={{
              fontSize: 12,
              padding: "6px 15px",
              background: "linear-gradient(135deg, var(--violet) 0%, #6D28D9 100%)",
              boxShadow: "0 0 16px rgba(124, 58, 237, 0.4)",
              border: "1px solid rgba(167, 139, 250, 0.3)",
              fontWeight: 700,
            }}
            disabled={busy}
            onClick={() =>
              guard(async () => {
                await runPollAll();
                await runDraft();
              })
            }
          >
            {busy ? "Running Pipeline…" : "Run Full Pipeline"}
          </button>

          <button
            type="button"
            className="admin-btn admin-btn-ghost"
            style={{
              fontSize: 12,
              padding: "6px 12px",
              borderColor: showFlow ? "rgba(124, 58, 237, 0.4)" : undefined,
              color: showFlow ? "var(--violet-deep)" : undefined,
              background: showFlow ? "rgba(124, 58, 237, 0.1)" : undefined,
            }}
            aria-expanded={showFlow}
            onClick={() => setShowFlow((v) => !v)}
          >
            {showFlow ? "Flow Visualizer ▴" : "Flow Visualizer ▾"}
          </button>

          <button
            type="button"
            className="admin-btn admin-btn-ghost"
            style={{
              fontSize: 12,
              padding: "6px 12px",
              borderColor: open ? "rgba(124, 58, 237, 0.4)" : undefined,
              color: open ? "var(--violet-deep)" : undefined,
              background: open ? "rgba(124, 58, 237, 0.1)" : undefined,
            }}
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
          >
            {open ? "Hide Sources ▴" : `${POLLER_LIST.length} Sources ▾`}
          </button>
        </div>
      </div>

      {/* Collapsible Pipeline Flow: Only render when showFlow || busy is true! Saves ~220px vertical space */}
      {(showFlow || busy) && (
        <div style={{ marginTop: 14, paddingTop: 14, borderTop: "1px solid rgba(255, 255, 255, 0.06)" }}>
          <PipelineFlow steps={steps} pollAllKey={POLL_ALL} draftKey={DRAFT} />
        </div>
      )}

      {/* Expandable 13 Sources Grid */}
      {open && (
        <div className="pipeline-sources" style={{ marginTop: 14, paddingTop: 14, borderTop: "1px solid rgba(255, 255, 255, 0.06)" }}>
          {POLLER_LIST.map(({ id, label }) => {
            const s = steps[id];
            return (
              <button
                key={id}
                type="button"
                className={`pipeline-source is-${s?.state ?? "idle"}`}
                disabled={busy}
                title={s?.detail}
                onClick={() => guard(() => runPoll(id))}
                style={{
                  background: "rgba(16, 18, 26, 0.6)",
                  border: "1px solid rgba(255, 255, 255, 0.08)",
                  borderRadius: "var(--r-sm)",
                  padding: "8px 11px",
                }}
              >
                <span>{label}</span>
                <span className="mono pipeline-source-detail" style={{ fontSize: 10.5 }}>
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
