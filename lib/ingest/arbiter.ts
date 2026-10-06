// sourced-clustering-upgrade-spec.md Part 4: LLM final-judgment stage in the
// tiered clustering funnel. One Ollama call per candidate group (a batch of
// signals connected by loosened-band 0.55-0.82 cosine similarity, see
// tiered-clustering.ts), asking which of them actually describe the same
// underlying complaint. Only runs behind ENABLE_TIERED_CLUSTERING.
//
// No "server-only" import here — this module is unit-tested directly under
// Vitest (same reasoning as competitive-landscape.ts).
import type { RawSignal } from "./types";
import { sanitizeForPrompt } from "./sanitize-for-prompt";

const DEFAULT_ARBITER_MODEL = "qwen2.5:7b-instruct";

const ARBITER_PROMPT = `You are reviewing complaint signals scraped from developer/tech forums to
find which ones describe the SAME underlying problem, even if worded very differently
across platforms.

Task: group the signals below by underlying problem. A group can have just one signal
if it doesn't match anything else. Only group signals if you're confident they describe
the same root complaint — not just the same general topic.

<signals>
{{signals}}
</signals>

Return ONLY valid JSON matching this exact schema, with no prose before or after:

{
  "groups": [
    {
      "signal_ids": string[],
      "shared_problem_summary": string, // one sentence describing the common complaint
      "confidence": "high" | "medium" | "low"
    }
  ]
}`;

export type ArbiterConfidence = "high" | "medium" | "low";

export interface ArbiterGroup {
  signalIds: string[];
  sharedProblemSummary: string;
  confidence: ArbiterConfidence;
}

interface RawArbiterGroup {
  signal_ids?: unknown;
  shared_problem_summary?: unknown;
  confidence?: unknown;
}

interface RawArbiterResponse {
  groups?: unknown;
}

/** Pulls the first top-level JSON object out of a model response, tolerating markdown fences or stray text around it — same approach as lib/llm/providers/shared.ts's extractJson. */
function extractArbiterJson(text: string): RawArbiterResponse {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced ? fenced[1] : text;
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  if (start === -1 || end === -1 || end < start) {
    throw new Error("Arbiter response did not contain a JSON object.");
  }
  return JSON.parse(candidate.slice(start, end + 1)) as RawArbiterResponse;
}

function normalizeGroups(raw: RawArbiterResponse): ArbiterGroup[] {
  if (!Array.isArray(raw.groups)) {
    throw new Error("Malformed arbiter response: missing groups array.");
  }
  return (raw.groups as RawArbiterGroup[])
    .filter((g): g is RawArbiterGroup & { signal_ids: unknown[] } => Array.isArray(g.signal_ids))
    .map((g) => ({
      signalIds: g.signal_ids.filter((id): id is string => typeof id === "string"),
      sharedProblemSummary: typeof g.shared_problem_summary === "string" ? g.shared_problem_summary : "",
      confidence:
        g.confidence === "high" || g.confidence === "medium" || g.confidence === "low" ? g.confidence : "low",
    }));
}

async function callOllamaArbiter(prompt: string, ollamaUrl: string, model: string): Promise<RawArbiterResponse> {
  const res = await fetch(`${ollamaUrl}/api/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      prompt,
      format: "json",
      stream: false,
      options: { temperature: 0, num_predict: 1024 },
    }),
    signal: AbortSignal.timeout(120_000),
  });
  if (!res.ok) {
    throw new Error(`Ollama arbiter request failed: ${res.status} ${await res.text()}`);
  }
  const body = (await res.json()) as { response: string };
  return extractArbiterJson(body.response);
}

export interface ArbitrateGroupResult {
  /** Groups the arbiter is confident (high/medium) describe the same complaint, 2+ signals only — singletons aren't clusters. */
  confirmedGroups: ArbiterGroup[];
  /** Low-confidence 2+ signal groups — surfaced as "borderline" for manual review rather than auto-passed into the gate. */
  borderlineGroups: ArbiterGroup[];
  error?: string;
}

/**
 * One Ollama call per candidate group. Retried once on failure (parse error,
 * timeout, non-2xx) before giving up on this group — a group that fails
 * both attempts contributes no confirmed/borderline groups and its error is
 * surfaced in the funnel stats rather than thrown, so one bad group doesn't
 * abort the whole draft pass.
 */
export async function arbitrateGroup(
  signalIds: string[],
  signals: RawSignal[],
  ollamaUrl = process.env.OLLAMA_URL,
): Promise<ArbitrateGroupResult> {
  if (!ollamaUrl) throw new Error("Missing OLLAMA_URL environment variable.");
  const model = process.env.OLLAMA_ARBITER_MODEL ?? process.env.OLLAMA_CLASSIFIER_MODEL ?? DEFAULT_ARBITER_MODEL;

  const idSet = new Set(signalIds);
  const payload = signals
    .filter((s) => idSet.has(s.id))
    .map((s) => ({ id: s.id, platform: s.source, title: s.title, body: s.text ? s.text.slice(0, 500) : null }));

  const prompt = ARBITER_PROMPT.replace("{{signals}}", sanitizeForPrompt(payload));

  let raw: RawArbiterResponse | undefined;
  let lastErr: unknown;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      raw = await callOllamaArbiter(prompt, ollamaUrl, model);
      break;
    } catch (err) {
      lastErr = err;
    }
  }
  if (!raw) {
    return { confirmedGroups: [], borderlineGroups: [], error: lastErr instanceof Error ? lastErr.message : String(lastErr) };
  }

  let groups: ArbiterGroup[];
  try {
    groups = normalizeGroups(raw);
  } catch (err) {
    return { confirmedGroups: [], borderlineGroups: [], error: err instanceof Error ? err.message : String(err) };
  }

  const multiSignalGroups = groups.filter((g) => g.signalIds.length >= 2);
  return {
    confirmedGroups: multiSignalGroups.filter((g) => g.confidence !== "low"),
    borderlineGroups: multiSignalGroups.filter((g) => g.confidence === "low"),
  };
}
