// ollama-classification-spec.md: single entry point for signal
// classification. Hides the provider choice from the ingest pipeline — tries
// Ollama first when OLLAMA_URL is configured (falcon), falls back to
// OpenRouter on any Ollama failure, and uses OpenRouter directly when
// OLLAMA_URL is unset (Vercel cron, laptop off the home LAN).
import { classifyViaOllama } from "./providers/ollama";
import { classifyViaOpenRouter } from "./providers/openrouter";
import type { ProviderClassifyInput } from "./providers/types";

export interface ClassifierInput extends ProviderClassifyInput {
  signalId: string;
}

export interface ClassifierOutput {
  isComplaint: boolean;
  problemStatement: string | null;
  domain: string | null;
  confidence: number;
  provider: "ollama" | "openrouter";
  latencyMs: number;
  tokens: number;
  /** True if Ollama was tried and failed, forcing the OpenRouter fallback. */
  fellBack: boolean;
  /** Ollama retries consumed before a parseable response came back. 0 when Ollama wasn't used or succeeded first try. */
  parseFailures: number;
}

/** Throws at pipeline startup if neither provider is configured — call once before a run, not per-call. */
export function assertClassifierConfigured(): void {
  if (!process.env.OLLAMA_URL && !process.env.OPENROUTER_API_KEY) {
    throw new Error("No classifier provider configured: set OLLAMA_URL or OPENROUTER_API_KEY.");
  }
}

/** Logs which provider(s) a run will use — call once at pipeline startup, not per-call. */
export function logClassifierStartup(): void {
  const ollamaUrl = process.env.OLLAMA_URL;
  if (ollamaUrl) {
    const model = process.env.OLLAMA_CLASSIFIER_MODEL ?? "qwen2.5:7b-instruct";
    console.log(`[classifier] Ollama available at ${ollamaUrl} (model: ${model})`);
    console.log(
      process.env.OPENROUTER_API_KEY
        ? "[classifier] OpenRouter fallback configured"
        : "[classifier] WARNING: no OpenRouter fallback configured — Ollama failures will hard-fail the signal",
    );
  } else {
    const model = process.env.OPENROUTER_CLASSIFY_MODEL ?? "google/gemini-3.5-flash-lite";
    console.log(`[classifier] Ollama unavailable, using OpenRouter (model: ${model})`);
  }
}

export async function classify(input: ClassifierInput): Promise<ClassifierOutput> {
  const ollamaUrl = process.env.OLLAMA_URL;

  if (ollamaUrl) {
    const start = Date.now();
    try {
      const result = await classifyViaOllama(input, ollamaUrl);
      return {
        isComplaint: result.isComplaint,
        problemStatement: result.problemStatement,
        domain: result.domain,
        confidence: result.confidence,
        provider: "ollama",
        latencyMs: Date.now() - start,
        tokens: result.tokens,
        fellBack: false,
        parseFailures: result.parseFailures,
      };
    } catch (err) {
      console.error(
        `[classifier] Ollama failed for signal ${input.signalId}, falling back to OpenRouter:`,
        err instanceof Error ? err.message : err,
      );
    }
  }

  const start = Date.now();
  const result = await classifyViaOpenRouter(input);
  return {
    isComplaint: result.isComplaint,
    problemStatement: result.problemStatement,
    domain: result.domain,
    confidence: result.confidence,
    provider: "openrouter",
    latencyMs: Date.now() - start,
    tokens: result.tokens,
    fellBack: Boolean(ollamaUrl),
    parseFailures: 0,
  };
}
