// No "server-only" import here — unlike most lib/ingest modules, this one is
// also imported directly by scripts/backfill-classification.ts, a plain
// tsx/node script outside Next.js's react-server condition, where the
// server-only marker package throws unconditionally. embeddings.ts (also
// imported by a standalone backfill script) follows the same convention.
import { classify } from "@/lib/llm/classifier";
import type { RawSignal } from "./types";

// Below this, a signal is treated the same as is_complaint: false — kept for
// audit but excluded from embedding/clustering. Suggested starting point
// per spec; not the classifier's own decision boundary.
export const CLASSIFICATION_CONFIDENCE_FLOOR = 0.6;

// Per-run cap (Part 2 cost control) — classification scales linearly with
// the volume expansion already shipped, so bound how many signals one pass
// classifies. Backfill runs override this via options.cap.
export const CLASSIFICATION_RUN_CAP = 500;

// Rough per-token pricing for a small model at this class — good enough for
// cost-tracking purposes, same rationale as embeddings.ts's USD_PER_TOKEN.
// Ollama calls (provider: "ollama") are free, so this only accrues cost for
// OpenRouter calls (primary or fallback) — see classifySignals below.
const USD_PER_TOKEN = 0.1 / 1_000_000;

export interface ClassificationResult {
  isComplaint: boolean;
  problemStatement: string | null;
  domain: string | null;
  confidence: number;
}

export interface ClassificationRunStats {
  requested: number;
  classified: number;
  errors: string[];
  costUsd: number;
  // ollama-classification-spec.md observability — the local/remote provider
  // mix for this run, written to pipeline_runs.
  ollamaCalls: number;
  openrouterCalls: number;
  ollamaLatencyMsTotal: number;
  openrouterLatencyMsTotal: number;
  fallbacks: number;
  parseFailures: number;
}

/** One classification call for a single signal — routed to Ollama or OpenRouter by lib/llm/classifier.ts. Throws on malformed/failed responses — callers must catch and skip, never crash the run. */
export async function classifySignal(
  signal: Pick<RawSignal, "id" | "title" | "text" | "source">,
): Promise<{ result: ClassificationResult; tokens: number; provider: "ollama" | "openrouter"; latencyMs: number; fellBack: boolean; parseFailures: number }> {
  const output = await classify({
    signalId: signal.id,
    title: signal.title,
    body: signal.text,
    platform: signal.source,
  });
  return {
    result: {
      isComplaint: output.isComplaint,
      problemStatement: output.problemStatement,
      domain: output.domain,
      confidence: output.confidence,
    },
    tokens: output.tokens,
    provider: output.provider,
    latencyMs: output.latencyMs,
    fellBack: output.fellBack,
    parseFailures: output.parseFailures,
  };
}

/**
 * Classifies every signal missing a classification, one call each, never
 * re-classifying an already-classified signal (caller passes only the
 * unclassified pool). Malformed/failed responses are logged and skipped —
 * classification never aborts the run for one bad signal.
 */
export async function classifySignals(
  signals: Pick<RawSignal, "id" | "title" | "text" | "source">[],
  options: { cap?: number } = {},
): Promise<{ results: { signalId: string; result: ClassificationResult }[]; stats: ClassificationRunStats }> {
  const pool = options.cap ? signals.slice(0, options.cap) : signals;
  const stats: ClassificationRunStats = {
    requested: pool.length,
    classified: 0,
    errors: [],
    costUsd: 0,
    ollamaCalls: 0,
    openrouterCalls: 0,
    ollamaLatencyMsTotal: 0,
    openrouterLatencyMsTotal: 0,
    fallbacks: 0,
    parseFailures: 0,
  };
  const results: { signalId: string; result: ClassificationResult }[] = [];

  for (const signal of pool) {
    try {
      const { result, tokens, provider, latencyMs, fellBack, parseFailures } = await classifySignal(signal);
      results.push({ signalId: signal.id, result });
      stats.classified++;
      stats.parseFailures += parseFailures;
      if (fellBack) stats.fallbacks++;
      if (provider === "ollama") {
        stats.ollamaCalls++;
        stats.ollamaLatencyMsTotal += latencyMs;
      } else {
        stats.openrouterCalls++;
        stats.openrouterLatencyMsTotal += latencyMs;
        stats.costUsd += tokens * USD_PER_TOKEN;
      }
    } catch (err) {
      stats.errors.push(`${signal.id}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  return { results, stats };
}
