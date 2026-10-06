// Queue that hands the draft pass from Vercel to the falcon worker
// (scripts/pipeline-worker.ts) — see supabase/migrations/0034_pipeline_jobs.sql.
import "server-only";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import type { DraftPassResult } from "./run-draft-pass";

const TABLE = "pipeline_jobs";

export type PipelineJobStatus = "queued" | "running" | "done" | "error";

export interface PipelineJob {
  id: string;
  stage: "draft";
  status: PipelineJobStatus;
  requestedBy: string | null;
  result: DraftPassResult | null;
  error: string | null;
  createdAt: string;
  startedAt: string | null;
  finishedAt: string | null;
}

interface PipelineJobRow {
  id: string;
  stage: "draft";
  status: PipelineJobStatus;
  requested_by: string | null;
  result: DraftPassResult | null;
  error: string | null;
  created_at: string;
  started_at: string | null;
  finished_at: string | null;
}

function rowToJob(r: PipelineJobRow): PipelineJob {
  return {
    id: r.id,
    stage: r.stage,
    status: r.status,
    requestedBy: r.requested_by,
    result: r.result,
    error: r.error,
    createdAt: r.created_at,
    startedAt: r.started_at,
    finishedAt: r.finished_at,
  };
}

/**
 * Whether this process can run the draft pass itself. The draft pass needs
 * local Ollama (classification + nomic embeddings), which only falcon has —
 * Vercel has no OLLAMA_URL, so there the pass is enqueued for the worker.
 * OpenRouter alone isn't enough: its embeddings live in a different vector
 * space than the nomic-embed-text vectors already stored.
 */
export function canRunDraftInline(): boolean {
  return Boolean(process.env.OLLAMA_URL);
}

/**
 * Enqueues a draft pass, or returns the one already queued/running — a
 * second click (or the cron firing mid-run) shouldn't stack duplicate passes
 * over the same signal pool.
 */
export async function enqueueDraftJob(requestedBy: string): Promise<PipelineJob> {
  const supabase = getSupabaseServerClient();
  const { data: active, error: activeError } = await supabase
    .from(TABLE)
    .select("*")
    .eq("stage", "draft")
    .in("status", ["queued", "running"])
    .order("created_at", { ascending: false })
    .limit(1);
  if (activeError) throw new Error(`enqueueDraftJob: ${activeError.message}`);
  if (active && active.length > 0) return rowToJob(active[0] as PipelineJobRow);

  const { data, error } = await supabase
    .from(TABLE)
    .insert({ stage: "draft", requested_by: requestedBy })
    .select("*")
    .single();
  if (error) throw new Error(`enqueueDraftJob: ${error.message}`);
  return rowToJob(data as PipelineJobRow);
}

export async function getPipelineJob(id: string): Promise<PipelineJob | null> {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase.from(TABLE).select("*").eq("id", id).maybeSingle();
  if (error) throw new Error(`getPipelineJob: ${error.message}`);
  return data ? rowToJob(data as PipelineJobRow) : null;
}

/** Most recent draft job in any state — lets the banner pick a run back up after navigation. */
export async function getLatestDraftJob(): Promise<PipelineJob | null> {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from(TABLE)
    .select("*")
    .eq("stage", "draft")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(`getLatestDraftJob: ${error.message}`);
  return data ? rowToJob(data as PipelineJobRow) : null;
}

/**
 * Claims the oldest queued job. The update is conditional on the row still
 * being queued, so if two workers race for it only one gets a row back.
 */
export async function claimNextJob(): Promise<PipelineJob | null> {
  const supabase = getSupabaseServerClient();
  const { data: next, error: nextError } = await supabase
    .from(TABLE)
    .select("id")
    .eq("status", "queued")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (nextError) throw new Error(`claimNextJob: ${nextError.message}`);
  if (!next) return null;

  const { data, error } = await supabase
    .from(TABLE)
    .update({ status: "running", started_at: new Date().toISOString() })
    .eq("id", (next as { id: string }).id)
    .eq("status", "queued")
    .select("*")
    .maybeSingle();
  if (error) throw new Error(`claimNextJob: ${error.message}`);
  return data ? rowToJob(data as PipelineJobRow) : null;
}

export async function finishJob(
  id: string,
  outcome: { result: DraftPassResult } | { error: string },
): Promise<void> {
  const supabase = getSupabaseServerClient();
  const { error } = await supabase
    .from(TABLE)
    .update(
      "result" in outcome
        ? { status: "done", result: outcome.result, finished_at: new Date().toISOString() }
        : { status: "error", error: outcome.error, finished_at: new Date().toISOString() },
    )
    .eq("id", id);
  if (error) throw new Error(`finishJob: ${error.message}`);
}

/** Jobs a previous worker claimed but never finished — it crashed or was stopped mid-pass. */
export async function listRunningJobs(): Promise<PipelineJob[]> {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase.from(TABLE).select("*").eq("status", "running");
  if (error) throw new Error(`listRunningJobs: ${error.message}`);
  return (data as PipelineJobRow[]).map(rowToJob);
}

/** Puts a job back in the queue so the next claim picks it up again. */
export async function requeueJob(id: string): Promise<void> {
  const supabase = getSupabaseServerClient();
  const { error } = await supabase
    .from(TABLE)
    .update({ status: "queued", started_at: null })
    .eq("id", id)
    .eq("status", "running");
  if (error) throw new Error(`requeueJob: ${error.message}`);
}
