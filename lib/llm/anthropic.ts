/**
 * Minimal Anthropic Messages API client. No SDK dependency is added here —
 * this is the one call site every ingest/prompt-generation module goes
 * through, so swapping in @anthropic-ai/sdk later is a single-file change.
 */
const API_URL = "https://api.anthropic.com/v1/messages";
const DEFAULT_MODEL = process.env.ANTHROPIC_MODEL ?? "claude-sonnet-4-5-20250929";

export interface CompleteJsonOptions {
  system: string;
  user: string;
  maxTokens?: number;
}

/**
 * Sends a single message expecting a JSON-only response (per this app's
 * "return only JSON, no preamble" pattern) and parses it. Throws if the API
 * key is missing, the request fails, or the response isn't valid JSON.
 */
export async function completeJson<T>(options: CompleteJsonOptions): Promise<T> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY is not set");
  }

  const response = await fetch(API_URL, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: DEFAULT_MODEL,
      max_tokens: options.maxTokens ?? 2048,
      system: options.system,
      messages: [{ role: "user", content: options.user }],
    }),
  });

  if (!response.ok) {
    throw new Error(`Anthropic API error: ${response.status} ${await response.text()}`);
  }

  const data = (await response.json()) as { content: { type: string; text?: string }[] };
  const text = data.content.find((block) => block.type === "text")?.text;
  if (!text) throw new Error("Anthropic response contained no text block");

  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error(`Anthropic response was not valid JSON: ${text.slice(0, 200)}`);
  }
}
