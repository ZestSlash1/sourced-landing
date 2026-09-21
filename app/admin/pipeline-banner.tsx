"use client";

import { useState } from "react";
import { POLLER_LIST } from "@/lib/ingest/poller-ids";

type StepState = "idle" | "running" | "done" | "error";

interface Step {
  state: StepState;
  detail?: string;
}

const POLL_ALL = "poll-all";
const DRAFT = "draft";

async function callStage(body: Record<string, unknown>): Promise<Record<string, unknown>> {
  const res = await fetch("/api/admin/pipeline/run", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) throw new Error(typeof json.error === "string" ? json.error : `HTTP ${res.status}`);
  return json;
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
 * outlive the function timeout.
 */
export default function PipelineBanner() {
  const [steps, setSteps] = useState<Record<string, Step>>({});
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(false);

  const set = (key: string, step: Step) => setSteps((prev) => ({ ...prev, [key]: step }));

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
    let failed = 0;
    for (const { id } of POLLER_LIST) {
      if (!(await runPoll(id))) failed++;
    }
    set(POLL_ALL, {
      state: failed === POLLER_LIST.length ? "error" : "done",
      detail: failed ? `${failed} of ${POLLER_LIST.length} sources failed` : "all sources polled",
    });
  }

  async function runDraft(): Promise<boolean> {
    set(DRAFT, { state: "running" });
    try {
      set(DRAFT, { state: "done", detail: summarizeDraft(await callStage({ stage: "draft" })) });
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
              draft: {draft.state === "running" ? "running… (can take a few minutes)" : draft.detail}
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
