// ollama-classification-spec.md: local classification via Ollama's
// /api/generate JSON mode. `format: "json"` is a top-level request field, NOT
// inside `options` — easy to get wrong, so it's asserted in the request body
// below rather than left to a comment. Pure function, no top-level side
// effects — lib/llm/classifier.ts owns the fallback-to-OpenRouter decision.
import type { ProviderClassifyInput, ProviderClassifyResult } from "./types";
import { buildClassificationPrompt, extractJson, normalizeClassification } from "./shared";

const DEFAULT_MODEL = "qwen2.5:7b-instruct";
// Retried on JSON parse failure with slightly elevated temperature before
// the caller falls back to OpenRouter — small local models occasionally
// wrap the JSON in prose at low temperature.
const RETRY_TEMPERATURES = [0.1, 0.2, 0.3];

export interface OllamaClassifyResult extends ProviderClassifyResult {
  /** Retries consumed before a parseable response came back (0 = first try succeeded). */
  parseFailures: number;
}

/** Pure function: one Ollama classification call, retried on parse failure. Throws if every attempt fails/errors — caller decides whether to fall back. */
export async function classifyViaOllama(
  input: ProviderClassifyInput,
  ollamaUrl = process.env.OLLAMA_URL,
): Promise<OllamaClassifyResult> {
  if (!ollamaUrl) throw new Error("Missing OLLAMA_URL environment variable.");
  const model = process.env.OLLAMA_CLASSIFIER_MODEL ?? DEFAULT_MODEL;
  const prompt = buildClassificationPrompt(input);

  let lastErr: unknown;
  for (let attempt = 0; attempt < RETRY_TEMPERATURES.length; attempt++) {
    try {
      const res = await fetch(`${ollamaUrl}/api/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model,
          prompt,
          format: "json",
          stream: false,
          options: { temperature: RETRY_TEMPERATURES[attempt], num_predict: 300 },
        }),
      });
      if (!res.ok) {
        throw new Error(`Ollama request failed: ${res.status} ${await res.text()}`);
      }
      const body = (await res.json()) as { response: string };
      const result = normalizeClassification(extractJson(body.response));
      const tokens = Math.ceil((input.body.length + (input.title?.length ?? 0) + body.response.length) / 4);
      return { ...result, tokens, parseFailures: attempt };
    } catch (err) {
      lastErr = err;
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error(String(lastErr));
}
