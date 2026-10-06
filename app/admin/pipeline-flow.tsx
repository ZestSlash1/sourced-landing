"use client";

import type { CSSProperties } from "react";
import { POLLER_LIST } from "@/lib/ingest/poller-ids";

type StepState = "idle" | "running" | "done" | "error";

export interface FlowStep {
  state: StepState;
  detail?: string;
  inserted?: number;
}

interface Props {
  steps: Record<string, FlowStep>;
  pollAllKey: string;
  draftKey: string;
}

/**
 * The draft pass runs classify -> cluster -> draft as one job (inline locally,
 * on the falcon worker in prod), and only reports at the end — so these three
 * nodes share the draft step's state rather than pretending to know which
 * sub-stage is active.
 */
const DRAFT_STAGES = [
  { id: "classify", label: "Classify", hint: "complaint?" },
  { id: "cluster", label: "Cluster", hint: "cosine ≥ threshold" },
  { id: "draft", label: "Draft", hint: "build brief" },
] as const;

/**
 * How many particles a source emits into the poll track, given how many new
 * signals it inserted. Drives the visual "volume" of each source's stream.
 */
export function particleCount(inserted: number | undefined): number {
  if (!inserted || inserted <= 0) return 0;
  return Math.min(6, Math.ceil(Math.log2(inserted + 1)));
}

function stateOf(s: FlowStep | undefined): StepState {
  return s?.state ?? "idle";
}

export default function PipelineFlow({ steps, pollAllKey, draftKey }: Props) {
  const poll = stateOf(steps[pollAllKey]);
  const draft = stateOf(steps[draftKey]);

  // Poll progress: how many sources have settled (done or error).
  const settled = POLLER_LIST.filter(({ id }) => {
    const s = stateOf(steps[id]);
    return s === "done" || s === "error";
  }).length;
  const anySource = POLLER_LIST.some(({ id }) => steps[id]);
  const pollState: StepState = poll !== "idle" ? poll : anySource ? "done" : "idle";
  const progress = POLLER_LIST.length ? settled / POLLER_LIST.length : 0;

  // The hand-off track lights up while drafting, or once poll finished and draft is next.
  const handoff: StepState = draft !== "idle" ? draft : "idle";

  return (
    <div className={`pflow ${poll === "running" || draft === "running" ? "is-live" : ""}`} aria-hidden="true">
      {/* Sources column */}
      <div className="pflow-sources">
        {POLLER_LIST.map(({ id, label }, i) => {
          const s = steps[id];
          const st = stateOf(s);
          const n = st === "done" ? particleCount(s?.inserted) : 0;
          return (
            <div
              key={id}
              className={`pflow-src is-${st}`}
              style={{ "--i": i } as CSSProperties}
              title={s?.detail}
            >
              <span className="pflow-src-dot" />
              <span className="pflow-src-label">{label}</span>
              {st === "done" && s?.inserted !== undefined && (
                <span className="pflow-src-count">+{s.inserted}</span>
              )}
              {Array.from({ length: n }, (_, k) => (
                <span key={k} className="pflow-emit" style={{ "--k": k } as CSSProperties} />
              ))}
            </div>
          );
        })}
      </div>

      {/* Poll node with ring progress */}
      <Track state={pollState} />
      <div className={`pflow-node is-${pollState}`}>
        <svg className="pflow-ring" viewBox="0 0 40 40">
          <circle cx="20" cy="20" r="17" className="pflow-ring-bg" />
          <circle
            cx="20"
            cy="20"
            r="17"
            className="pflow-ring-fg"
            style={{ strokeDashoffset: 106.8 * (1 - (pollState === "idle" ? 0 : progress)) }}
          />
        </svg>
        <span className="pflow-node-label">Ingest</span>
        <span className="pflow-node-hint mono">
          {pollState === "idle" ? "raw_signals" : `${settled}/${POLLER_LIST.length}`}
        </span>
      </div>

      {/* Draft job: classify -> cluster -> draft, run as one unit */}
      <Track state={handoff} />
      <div className={`pflow-job is-${draft}`}>
        <span className="pflow-job-tag mono">{draft === "running" ? "draft job · live" : "draft job"}</span>
        <div className="pflow-job-row">
          {DRAFT_STAGES.map((stage, i) => (
            <div key={stage.id} className="pflow-job-stage" style={{ "--i": i } as CSSProperties}>
              {i > 0 && <Track state={draft} small />}
              <div className={`pflow-node is-${draft}`}>
                <span className="pflow-node-label">{stage.label}</span>
                <span className="pflow-node-hint mono">{stage.hint}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Review sink */}
      <Track state={draft === "done" ? "done" : "idle"} />
      <div className={`pflow-node pflow-sink is-${draft === "done" ? "done" : "idle"}`}>
        <span className="pflow-node-label">Review</span>
        <span className="pflow-node-hint mono">/admin/pending</span>
      </div>
    </div>
  );
}

function Track({ state, small }: { state: StepState; small?: boolean }) {
  return (
    <div className={`pflow-track is-${state} ${small ? "is-small" : ""}`}>
      <span className="pflow-pkt" />
      <span className="pflow-pkt" />
      <span className="pflow-pkt" />
    </div>
  );
}
