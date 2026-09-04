// omniroute-drafts-and-ollama-lockin-spec.md Part 2: single entry point for
// draft generation, same shape as lib/llm/classifier.ts. Hides the provider
// choice from the ingest pipeline — tries OmniRoute first when OMNIROUTE_URL
// is configured (falcon), falls back to OpenRouter on any OmniRoute failure
// (one retry first), and uses OpenRouter directly when OMNIROUTE_URL is
// unset (Vercel cron, laptop off the home LAN).
import { generateDraftViaOmniRoute } from "./providers/omniroute";
import { generateDraftViaOllama } from "./providers/ollama";
import { generateDraftViaOpenRouter } from "./providers/openrouter";

export interface DraftGenerationOutput {
  content: string;
  provider: "omniroute" | "ollama" | "openrouter";
  model: string;
  tokens: number;
  latencyMs: number;
  /** True if a primary provider failed, forcing fallback. */
  fellBack: boolean;
}

/** Throws at pipeline startup if no provider is configured — call once before a run, not per-call. */
export function assertDraftGeneratorConfigured(): void {
  if (!process.env.OMNIROUTE_URL && !process.env.OLLAMA_URL && !process.env.OPENROUTER_API_KEY) {
    throw new Error("No draft-generation provider configured: set OMNIROUTE_URL, OLLAMA_URL, or OPENROUTER_API_KEY.");
  }
}

/** Logs which provider(s) a run will use — call once at pipeline startup, not per-call. */
export function logDraftGeneratorStartup(): void {
  const omniRouteUrl = process.env.OMNIROUTE_URL;
  const ollamaUrl = process.env.OLLAMA_URL;
  if (omniRouteUrl) {
    const model = process.env.OMNIROUTE_DRAFT_MODEL ?? "auto";
    console.log(`[draft-generator] OmniRoute available at ${omniRouteUrl} (model: ${model})`);
    console.log(
      ollamaUrl
        ? `[draft-generator] Ollama configured as secondary fallback at ${ollamaUrl}`
        : process.env.OPENROUTER_API_KEY
        ? "[draft-generator] OpenRouter configured as fallback (balance not checked at startup)"
        : "[draft-generator] WARNING: no fallback configured — OmniRoute failures will hard-fail the cluster",
    );
  } else if (ollamaUrl) {
    const model = process.env.OLLAMA_DRAFT_MODEL ?? process.env.OLLAMA_CLASSIFIER_MODEL ?? "gemma3:4b";
    console.log(`[draft-generator] OmniRoute unavailable, using Ollama at ${ollamaUrl} (model: ${model})`);
  } else {
    const model = process.env.OPENROUTER_DRAFT_MODEL ?? "meta-llama/llama-3.3-70b-instruct:free";
    console.log(`[draft-generator] OmniRoute and Ollama unavailable, using OpenRouter (model: ${model})`);
  }
}

export async function generateDraft(prompt: string): Promise<DraftGenerationOutput> {
  const omniRouteUrl = process.env.OMNIROUTE_URL;
  const ollamaUrl = process.env.OLLAMA_URL;
  let fellBack = false;

  if (omniRouteUrl) {
    const start = Date.now();
    // One retry before falling back — mirrors the classifier's tolerance for
    // a single transient failure without immediately paying the fallback cost.
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const result = await generateDraftViaOmniRoute(prompt, omniRouteUrl);
        return {
          content: result.content,
          provider: "omniroute",
          model: result.model,
          tokens: result.tokens,
          latencyMs: Date.now() - start,
          fellBack: false,
        };
      } catch (err) {
        console.error(
          `[draft-generator] OmniRoute attempt ${attempt + 1} failed:`,
          err instanceof Error ? err.message : err,
        );
      }
    }
    console.error("[draft-generator] OmniRoute failed after retry, falling back to Ollama / OpenRouter");
    fellBack = true;
  }

  if (ollamaUrl) {
    const start = Date.now();
    try {
      const result = await generateDraftViaOllama(prompt, ollamaUrl);
      return {
        content: result.content,
        provider: "ollama",
        model: result.model,
        tokens: result.tokens,
        latencyMs: Date.now() - start,
        fellBack,
      };
    } catch (err) {
      console.error(
        "[draft-generator] Ollama draft failed, falling back to OpenRouter:",
        err instanceof Error ? err.message : err,
      );
      fellBack = true;
    }
  }

  const start = Date.now();
  const result = await generateDraftViaOpenRouter(prompt);
  return {
    content: result.content,
    provider: "openrouter",
    model: result.model,
    tokens: result.tokens,
    latencyMs: Date.now() - start,
    fellBack: Boolean(omniRouteUrl || ollamaUrl),
  };
}
