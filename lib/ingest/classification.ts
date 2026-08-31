// No "server-only" import here — unlike most lib/ingest modules, this one is
// also imported directly by scripts/backfill-classification.ts, a plain
// tsx/node script outside Next.js's react-server condition, where the
// server-only marker package throws unconditionally. embeddings.ts (also
// imported by a standalone backfill script) follows the same convention.
import { TOPICS } from "@/lib/topics";
import type { RawSignal } from "./types";

// Cheap/fast model — this runs once per signal at ingest volume, it's a
// classification task not a drafting task. Override via env if the default
// gets deprecated. Separate from OPENROUTER_DRAFT_MODEL (draft-model.ts),
// which stays a heavier free model reserved for the much rarer draft call.
const MODEL = process.env.OPENROUTER_CLASSIFY_MODEL ?? "google/gemini-3.5-flash-lite";
const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

// Below this, a signal is treated the same as is_complaint: false — kept for
// audit but excluded from embedding/clustering. Suggested starting point
// per spec; not the classifier's own decision boundary.
export const CLASSIFICATION_CONFIDENCE_FLOOR = 0.6;

// Per-run cap (Part 2 cost control) — classification scales linearly with
// the volume expansion already shipped, so bound how many signals one pass
// classifies. Backfill runs override this via options.cap.
export const CLASSIFICATION_RUN_CAP = 500;

// Rough OpenRouter pricing for a small model at this class — good enough for
// cost-tracking purposes, same rationale as embeddings.ts's USD_PER_TOKEN.
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
}

interface RawClassification {
  is_complaint: boolean;
  problem_statement?: string;
  domain?: string;
  confidence: number;
}

function truncate(text: string, max = 1000): string {
  return text.length > max ? `${text.slice(0, max)}...` : text;
}

function buildPrompt(signal: Pick<RawSignal, "title" | "text">): string {
  return `Classify the following forum/issue-tracker post. Determine whether it expresses a genuine unmet need, friction, or workaround experienced by the author or someone they describe — as opposed to a product launch, announcement, news discussion, a question with a clean documented answer, or general commentary.

Post:
${signal.title ? `title: ${signal.title}\n` : ""}text: ${truncate(signal.text)}

Respond with ONLY a single JSON object, no markdown fences, no commentary:
{
  "is_complaint": boolean,
  "problem_statement": string — ONLY if is_complaint is true. One normalized sentence in this fixed shape: "<who> can't <what they're blocked from doing>". Be concrete about the actor and the blocked action. This sentence will be embedded and compared against other problem statements, so keep the grammatical shape and voice consistent — no platform-specific jargon, no quoting the source verbatim.
  "domain": string — ONLY if is_complaint is true. Pick the single closest match from this fixed list, exactly as written: ${TOPICS.map((t) => `"${t}"`).join(", ")}
  "confidence": number between 0 and 1 — your confidence in the is_complaint classification.
}

If is_complaint is false, omit problem_statement and domain (or set them to null).`;
}

/** Pulls the first top-level JSON object out of a model response, tolerating markdown fences or stray text around it. */
function extractJson(text: string): RawClassification {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced ? fenced[1] : text;
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  if (start === -1 || end === -1 || end < start) {
    throw new Error("Model response did not contain a JSON object.");
  }
  return JSON.parse(candidate.slice(start, end + 1)) as RawClassification;
}

function normalize(raw: RawClassification): ClassificationResult {
  if (typeof raw.is_complaint !== "boolean" || typeof raw.confidence !== "number") {
    throw new Error("Malformed classification response: missing is_complaint/confidence.");
  }
  const confidence = Math.max(0, Math.min(1, raw.confidence));
  if (!raw.is_complaint) {
    return { isComplaint: false, problemStatement: null, domain: null, confidence };
  }
  const problemStatement = raw.problem_statement?.trim() || null;
  const domain = raw.domain?.trim() || null;
  return { isComplaint: true, problemStatement, domain, confidence };
}

/** One OpenRouter classification call for a single signal. Throws on malformed/failed responses — callers must catch and skip, never crash the run. */
export async function classifySignal(signal: Pick<RawSignal, "title" | "text">): Promise<{ result: ClassificationResult; tokens: number }> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error("Missing OPENROUTER_API_KEY environment variable.");

  const res = await fetch(OPENROUTER_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "https://sourced.app",
      "X-Title": "Sourced ingest classification",
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [{ role: "user", content: buildPrompt(signal) }],
      temperature: 0,
      max_tokens: 300,
    }),
  });

  if (!res.ok) {
    throw new Error(`OpenRouter classification request failed: ${res.status} ${await res.text()}`);
  }

  const body = (await res.json()) as {
    choices: { message: { content: string } }[];
    usage?: { total_tokens?: number };
  };
  const content = body.choices[0]?.message?.content;
  if (!content) throw new Error("OpenRouter classification returned no message content.");

  const result = normalize(extractJson(content));
  const tokens = body.usage?.total_tokens ?? Math.ceil((signal.text.length + (signal.title?.length ?? 0)) / 4);
  return { result, tokens };
}

/**
 * Classifies every signal missing a classification, one call each, never
 * re-classifying an already-classified signal (caller passes only the
 * unclassified pool). Malformed/failed responses are logged and skipped —
 * classification never aborts the run for one bad signal.
 */
export async function classifySignals(
  signals: Pick<RawSignal, "id" | "title" | "text">[],
  options: { cap?: number } = {},
): Promise<{ results: { signalId: string; result: ClassificationResult }[]; stats: ClassificationRunStats }> {
  const pool = options.cap ? signals.slice(0, options.cap) : signals;
  const stats: ClassificationRunStats = { requested: pool.length, classified: 0, errors: [], costUsd: 0 };
  const results: { signalId: string; result: ClassificationResult }[] = [];

  for (const signal of pool) {
    try {
      const { result, tokens } = await classifySignal(signal);
      results.push({ signalId: signal.id, result });
      stats.classified++;
      stats.costUsd += tokens * USD_PER_TOKEN;
    } catch (err) {
      stats.errors.push(`${signal.id}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  return { results, stats };
}
