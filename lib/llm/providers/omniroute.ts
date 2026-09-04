// omniroute-drafts-and-ollama-lockin-spec.md: draft generation via OmniRoute,
// a self-hosted AI gateway on falcon (default http://localhost:20128,
// currently routing "auto" to gemini-3.1-pro). Same OpenAI-compatible
// chat-completions shape as OpenRouter, confirmed via manual curl testing —
// pure function, no top-level side effects; lib/llm/draft-generator.ts owns
// the fallback-to-OpenRouter decision.
import type { ProviderDraftResult } from "./types";

const DEFAULT_MODEL = "gemini/gemini-3.6-flash";

/** Pure function: one OmniRoute draft-generation call. Throws on failure/malformed output — caller decides whether to fall back. */
export async function generateDraftViaOmniRoute(
  prompt: string,
  omniRouteUrl = process.env.OMNIROUTE_URL,
): Promise<ProviderDraftResult> {
  if (!omniRouteUrl) throw new Error("Missing OMNIROUTE_URL environment variable.");
  const model = process.env.OMNIROUTE_DRAFT_MODEL ?? DEFAULT_MODEL;

  const res = await fetch(`${omniRouteUrl}/v1/chat/completions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      // Always explicit: omitting this returns SSE chunks instead of a
      // single JSON response, which breaks the JSON.parse below.
      stream: false,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "You are an automated backend API for Sourced (getsourced.dev). You must output ONLY a single valid JSON object following the schema, with no markdown fences, no preamble, and no conversational filler.",
        },
        { role: "user", content: prompt },
      ],
    }),
    signal: AbortSignal.timeout(180_000),
  });

  if (!res.ok) {
    throw new Error(`OmniRoute draft request failed: ${res.status} ${await res.text()}`);
  }

  const body = (await res.json()) as {
    choices: { message: { content: string } }[];
    model?: string;
    usage?: { total_tokens?: number };
  };
  const content = body.choices[0]?.message?.content;
  if (!content) throw new Error("OmniRoute draft request returned no message content.");

  const start = content.indexOf("{");
  const end = content.lastIndexOf("}");
  if (start === -1 || end === -1 || end < start) {
    throw new Error(`OmniRoute response did not contain a JSON object. Snippet: ${content.slice(0, 150)}`);
  }

  return {
    content,
    // "auto" can silently resolve to a different backend than expected —
    // log the model OmniRoute actually used, not the requested alias, so a
    // quality dip can be traced to a routing change.
    model: body.model ?? model,
    tokens: body.usage?.total_tokens ?? Math.ceil((prompt.length + content.length) / 4),
  };
}
