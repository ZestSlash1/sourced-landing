// Extracted from lib/ingest/classification.ts (ollama-classification-spec.md
// Part 2) so lib/llm/classifier.ts can call it as a fallback without owning
// prompt/parsing logic twice. Same prompt, same model, same max_tokens as
// before this refactor — behavior is unchanged, only the call site moved.
import type { ProviderClassifyInput, ProviderClassifyResult, ProviderDraftResult } from "./types";
import { buildClassificationPrompt, extractJson, normalizeClassification } from "./shared";

const MODEL = process.env.OPENROUTER_CLASSIFY_MODEL ?? "google/gemini-3.5-flash-lite";
const DRAFT_MODEL = process.env.OPENROUTER_DRAFT_MODEL ?? "meta-llama/llama-3.3-70b-instruct";
const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

/** Pure function: one OpenRouter classification call. Throws on failure/malformed output — no top-level side effects. */
export async function classifyViaOpenRouter(input: ProviderClassifyInput): Promise<ProviderClassifyResult> {
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
      messages: [{ role: "user", content: buildClassificationPrompt(input) }],
      temperature: 0,
      max_tokens: 300,
    }),
    signal: AbortSignal.timeout(30_000),
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

  const result = normalizeClassification(extractJson(content));
  const tokens = body.usage?.total_tokens ?? Math.ceil((input.body.length + (input.title?.length ?? 0)) / 4);
  return { ...result, tokens };
}

// omniroute-drafts-and-ollama-lockin-spec.md Part 2: extracted from
// lib/ingest/draft-model.ts so lib/llm/draft-generator.ts can call it as the
// fallback when OmniRoute is unset or fails. Same model/temperature/endpoint
// as before this refactor — the prompt itself is built by the caller.
export async function generateDraftViaOpenRouter(prompt: string): Promise<ProviderDraftResult> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error("Missing OPENROUTER_API_KEY environment variable.");

  const res = await fetch(OPENROUTER_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "https://sourced.app",
      "X-Title": "Sourced ingest",
    },
    body: JSON.stringify({
      model: DRAFT_MODEL,
      messages: [{ role: "user", content: prompt }],
      temperature: 0.4,
    }),
    signal: AbortSignal.timeout(60_000),
  });

  if (!res.ok) {
    throw new Error(`OpenRouter draft request failed: ${res.status} ${await res.text()}`);
  }

  const body = (await res.json()) as {
    choices: { message: { content: string } }[];
    model?: string;
    usage?: { total_tokens?: number };
  };
  const content = body.choices[0]?.message?.content;
  if (!content) throw new Error("OpenRouter draft request returned no message content.");

  return {
    content,
    model: body.model ?? DRAFT_MODEL,
    tokens: body.usage?.total_tokens ?? Math.ceil((prompt.length + content.length) / 4),
  };
}
