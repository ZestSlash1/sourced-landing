import { denoise } from "./stopwords";
import type { RawSignal } from "./types";

// Primary: Local Ollama with nomic-embed-text (768 dims) — 100% free, runs locally.
// Fallback: OpenRouter with openai/text-embedding-3-small (1536 dims).
export const OLLAMA_EMBED_MODEL = process.env.OLLAMA_EMBED_MODEL ?? "nomic-embed-text";
export const OPENROUTER_EMBED_MODEL = "openai/text-embedding-3-small";
export const OPENROUTER_EMBED_URL = "https://openrouter.ai/api/v1/embeddings";
export const EMBEDDING_DIMENSIONS = 768;

// nomic-embed-text context window is 8192 tokens. ~4 chars/token is
// a safe rule of thumb for English prose, so this stays well under it even
// for a few outlier signals in one batch.
const MAX_INPUT_CHARS = 24000;
const BATCH_SIZE = 40;
// Per OpenRouter's published pricing for openai/text-embedding-3-small.
const USD_PER_TOKEN = 0.02 / 1_000_000;

export interface EmbeddingRunStats {
  requested: number;
  generated: number;
  errors: string[];
  costUsd: number;
  provider?: "ollama" | "openrouter";
}

/** Rough token estimate for cost reporting — good enough at this cost scale to not be worth a real tokenizer. */
function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

/**
 * Embeds problem_statement, not raw title/body (sourced-pipeline-quality-spec.md
 * Part 2) — cosine similarity over raw prose compares writing style as much
 * as meaning, which is why the same complaint on GitLab vs HN vs Stack
 * Exchange never clustered even after the Jaccard->cosine migration. Callers
 * must only pass classified, is_complaint=true signals here; a signal
 * without a problem_statement has nothing meaningful to embed.
 */
function embeddingInput(signal: Pick<RawSignal, "problemStatement" | "title" | "text">): string {
  // problem_statement is already a single normalized sentence with no
  // platform boilerplate — denoise() (built to strip "Show HN:"/"Ask HN:"
  // noise from raw prose) has nothing left to usefully remove there and
  // would only risk stripping load-bearing words like "not"/"no". Only
  // fall back to raw title/text (and denoise it) for a legacy signal that
  // predates classification.
  if (signal.problemStatement) return signal.problemStatement.slice(0, MAX_INPUT_CHARS);
  const raw = signal.title ? `${signal.title}\n\n${signal.text}` : signal.text;
  return denoise(raw).slice(0, MAX_INPUT_CHARS);
}

interface OpenRouterEmbeddingResponse {
  data: { embedding: number[]; index: number }[];
  usage?: { total_tokens?: number };
}

interface OllamaEmbeddingResponse {
  model: string;
  embeddings: number[][];
  prompt_eval_count?: number;
}

async function embedBatchOllama(
  inputs: string[],
  ollamaUrl: string,
): Promise<{ embeddings: (number[] | null)[]; tokens: number; error?: string }> {
  const model = process.env.OLLAMA_EMBED_MODEL ?? OLLAMA_EMBED_MODEL;
  const endpoint = `${ollamaUrl.replace(/\/+$/, "")}/api/embed`;

  const res = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model, input: inputs }),
  });

  if (!res.ok) {
    const body = await res.text();
    return {
      embeddings: inputs.map(() => null),
      tokens: 0,
      error: `Ollama embeddings request failed: ${res.status} ${body}`,
    };
  }

  const body = (await res.json()) as OllamaEmbeddingResponse;
  const embeddings: (number[] | null)[] = body.embeddings ?? inputs.map(() => null);
  const tokens = body.prompt_eval_count ?? inputs.reduce((sum, t) => sum + estimateTokens(t), 0);
  return { embeddings, tokens };
}

async function embedBatchOpenRouter(
  inputs: string[],
): Promise<{ embeddings: (number[] | null)[]; tokens: number; error?: string }> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error("Missing OPENROUTER_API_KEY environment variable.");

  const res = await fetch(OPENROUTER_EMBED_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "https://sourced.app",
      "X-Title": "Sourced ingest",
    },
    body: JSON.stringify({ model: OPENROUTER_EMBED_MODEL, input: inputs }),
  });

  if (!res.ok) {
    const body = await res.text();
    return {
      embeddings: inputs.map(() => null),
      tokens: 0,
      error: `OpenRouter embeddings request failed: ${res.status} ${body}`,
    };
  }

  const body = (await res.json()) as OpenRouterEmbeddingResponse;
  const embeddings = new Array<number[] | null>(inputs.length).fill(null);
  for (const item of body.data) {
    embeddings[item.index] = item.embedding;
  }
  const tokens = body.usage?.total_tokens ?? inputs.reduce((sum, t) => sum + estimateTokens(t), 0);
  return { embeddings, tokens };
}

async function embedBatch(
  inputs: string[],
): Promise<{ embeddings: (number[] | null)[]; tokens: number; costUsd: number; provider: "ollama" | "openrouter"; error?: string }> {
  const ollamaUrl = process.env.OLLAMA_URL;
  if (ollamaUrl) {
    try {
      const ollamaResult = await embedBatchOllama(inputs, ollamaUrl);
      if (!ollamaResult.error) {
        return { ...ollamaResult, costUsd: 0, provider: "ollama" };
      }
      console.warn(`[embeddings] Ollama embed returned error, trying OpenRouter fallback: ${ollamaResult.error}`);
    } catch (err) {
      console.error("[embeddings] Ollama embed failed, falling back to OpenRouter:", err instanceof Error ? err.message : err);
    }
  }

  const openRouterResult = await embedBatchOpenRouter(inputs);
  return {
    ...openRouterResult,
    costUsd: openRouterResult.tokens * USD_PER_TOKEN,
    provider: "openrouter",
  };
}

/**
 * Generates embeddings for every signal missing one, batched (BATCH_SIZE per
 * request rather than one call per signal). Returns each signal paired with
 * its embedding (or null if generation failed for it) so the caller can
 * merge results back in without a second DB round trip to figure out what
 * succeeded.
 */
export async function generateMissingEmbeddings(
  signals: RawSignal[],
): Promise<{ results: { signalId: string; embedding: number[] }[]; stats: EmbeddingRunStats }> {
  const missing = signals.filter((s) => !s.embedding);
  const stats: EmbeddingRunStats = { requested: missing.length, generated: 0, errors: [], costUsd: 0 };
  const results: { signalId: string; embedding: number[] }[] = [];

  if (missing.length === 0) return { results, stats };

  for (let i = 0; i < missing.length; i += BATCH_SIZE) {
    const batch = missing.slice(i, i + BATCH_SIZE);
    const inputs = batch.map((s) => embeddingInput(s));
    try {
      const { embeddings, costUsd, provider, error } = await embedBatch(inputs);
      if (error) stats.errors.push(error);
      stats.costUsd += costUsd;
      if (provider) stats.provider = provider;
      embeddings.forEach((embedding, idx) => {
        if (embedding) {
          results.push({ signalId: batch[idx].id, embedding });
          stats.generated++;
        }
      });
    } catch (err) {
      stats.errors.push(err instanceof Error ? err.message : String(err));
    }
  }

  return { results, stats };
}

/**
 * PostgREST serializes a pgvector column's value as its text output
 * ("[0.1,0.2,...]"), not a native JSON array, since `vector` isn't a type it
 * has built-in JSON support for (see pgvector-migration-spec.md Phase F).
 * That text happens to be valid JSON array syntax, so parse it here rather
 * than at every read site. Handles the already-an-array case too, for
 * callers still on the pre-Phase-F jsonb column shape.
 */
export function parseEmbeddingField(raw: unknown): number[] | null {
  if (Array.isArray(raw)) return raw as number[];
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? (parsed as number[]) : null;
    } catch {
      return null;
    }
  }
  return null;
}

export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length || a.length === 0) return 0;
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}
