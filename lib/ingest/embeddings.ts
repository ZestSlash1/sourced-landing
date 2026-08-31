import { denoise } from "./stopwords";
import type { RawSignal } from "./types";

// Routed through OpenRouter rather than OpenAI directly: this project already
// authenticates to OpenRouter for draft generation (see draft-model.ts), so
// reusing OPENROUTER_API_KEY needs zero new credentials. OpenRouter proxies
// OpenAI's embedding models 1:1 on price ($0.02/1M tokens) at an
// OpenAI-compatible /embeddings endpoint.
const EMBEDDING_MODEL = "openai/text-embedding-3-small";
const EMBEDDING_URL = "https://openrouter.ai/api/v1/embeddings";
export const EMBEDDING_DIMENSIONS = 1536;

// text-embedding-3-small's context window is 8192 tokens. ~4 chars/token is
// a safe rule of thumb for English prose, so this stays well under it even
// for a few outlier signals in one batch.
const MAX_INPUT_CHARS = 24000;
const BATCH_SIZE = 40;
// Per OpenRouter's published pricing for this model.
const USD_PER_TOKEN = 0.02 / 1_000_000;

export interface EmbeddingRunStats {
  requested: number;
  generated: number;
  errors: string[];
  costUsd: number;
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

async function embedBatch(inputs: string[]): Promise<{ embeddings: (number[] | null)[]; tokens: number; error?: string }> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error("Missing OPENROUTER_API_KEY environment variable.");

  const res = await fetch(EMBEDDING_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "https://sourced.app",
      "X-Title": "Sourced ingest",
    },
    body: JSON.stringify({ model: EMBEDDING_MODEL, input: inputs }),
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
      const { embeddings, tokens, error } = await embedBatch(inputs);
      if (error) stats.errors.push(error);
      stats.costUsd += tokens * USD_PER_TOKEN;
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
