/**
 * ollama-classification-spec.md cost-model check: before routing production
 * classification traffic through Ollama, sanity-check that the local model
 * agrees with OpenRouter closely enough to trust. Picks 50 random already-
 * classified signals and reclassifies each fresh via BOTH providers directly
 * (bypassing the OpenRouter-fallback path in lib/llm/classifier.ts so every
 * call actually hits the provider it names) — not against the row's stored
 * `classified_as_complaint`, which was labeled under whatever prompt was live
 * at ingest time and would make prompt-tightening changes look like false
 * regressions. Reports per-field agreement:
 *   - isComplaint: exact match rate
 *   - domain: exact match rate (logged for manual review below that)
 *   - problemStatement: cosine similarity of embeddings, >0.85 counted as
 *     agreement
 *
 * Target: >90% isComplaint agreement, >80% domain overlap. Below that,
 * prompt engineering is needed before switching production traffic — this
 * script only measures, it doesn't change anything.
 *
 * Requires OLLAMA_URL to be reachable (run this on falcon) and
 * OPENROUTER_API_KEY for the parity embeddings.
 */
import { config } from "dotenv";
config({ path: ".env.local" });
import { createClient } from "@supabase/supabase-js";
import { classifyViaOllama } from "../lib/llm/providers/ollama";
import { classifyViaOpenRouter } from "../lib/llm/providers/openrouter";
import { cosineSimilarity } from "../lib/ingest/embeddings";

const SAMPLE_SIZE = 50;
const PROBLEM_STATEMENT_SIMILARITY_FLOOR = 0.85;
const EMBEDDING_MODEL = "openai/text-embedding-3-small";
const EMBEDDING_URL = "https://openrouter.ai/api/v1/embeddings";

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });

interface ClassifiedSignalRow {
  id: string;
  source: string;
  title: string | null;
  text: string;
  classified_as_complaint: boolean;
  problem_statement: string | null;
  domain: string | null;
}

async function fetchSample(): Promise<ClassifiedSignalRow[]> {
  // Postgres doesn't have a cheap true-random sample at scale, but this
  // corpus is small enough that ordering by a random column server-side is
  // fine for a one-off diagnostic script.
  const { data, error } = await sb
    .from("raw_signals")
    .select("id, source, title, text, classified_as_complaint, problem_statement, domain")
    .not("classified_as_complaint", "is", null)
    .order("id")
    .limit(2000);
  if (error) throw new Error(error.message);
  const rows = data as ClassifiedSignalRow[];
  // Shuffle then take SAMPLE_SIZE — cheaper than a DB-side random() sort on
  // a table without an index for it.
  for (let i = rows.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [rows[i], rows[j]] = [rows[j], rows[i]];
  }
  return rows.slice(0, SAMPLE_SIZE);
}

async function embed(text: string): Promise<number[] | null> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error("Missing OPENROUTER_API_KEY environment variable.");
  const res = await fetch(EMBEDDING_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "https://sourced.app",
      "X-Title": "Sourced classifier parity check",
    },
    body: JSON.stringify({ model: EMBEDDING_MODEL, input: text }),
  });
  if (!res.ok) {
    console.error(`Embedding request failed: ${res.status} ${await res.text()}`);
    return null;
  }
  const body = (await res.json()) as { data: { embedding: number[] }[] };
  return body.data[0]?.embedding ?? null;
}

interface RowResult {
  signalId: string;
  isComplaintMatch: boolean;
  domainMatch: boolean | "n/a";
  problemStatementSimilarity: number | "n/a";
  ollamaIsComplaint: boolean;
  openrouterIsComplaint: boolean;
  ollamaDomain: string | null;
  openrouterDomain: string | null;
}

async function main() {
  if (!process.env.OLLAMA_URL) {
    throw new Error("OLLAMA_URL is not set — run this script on falcon (or wherever Ollama is reachable).");
  }

  const sample = await fetchSample();
  console.log(`Reclassifying ${sample.length} previously-OpenRouter-classified signal(s) via Ollama...`);

  const results: RowResult[] = [];
  const errors: string[] = [];

  for (const row of sample) {
    try {
      // Sequential, not Promise.all: this OpenRouter account's in-flight
      // request budget is low enough that classify + 2 embed calls stacked
      // concurrently trip 402 in_flight_budget_exhausted.
      const input = { title: row.title, body: row.text, platform: row.source };
      const ollama = await classifyViaOllama(input);
      const openrouter = await classifyViaOpenRouter(input);

      let problemStatementSimilarity: number | "n/a" = "n/a";
      if (openrouter.isComplaint && ollama.isComplaint && openrouter.problemStatement && ollama.problemStatement) {
        const a = await embed(openrouter.problemStatement);
        const b = await embed(ollama.problemStatement);
        if (a && b) problemStatementSimilarity = cosineSimilarity(a, b);
      }

      results.push({
        signalId: row.id,
        isComplaintMatch: openrouter.isComplaint === ollama.isComplaint,
        domainMatch:
          openrouter.isComplaint && ollama.isComplaint ? (openrouter.domain ?? null) === (ollama.domain ?? null) : "n/a",
        problemStatementSimilarity,
        ollamaIsComplaint: ollama.isComplaint,
        openrouterIsComplaint: openrouter.isComplaint,
        ollamaDomain: ollama.domain,
        openrouterDomain: openrouter.domain,
      });
    } catch (err) {
      errors.push(`${row.id}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  const n = results.length;
  const isComplaintAgreement = n > 0 ? results.filter((r) => r.isComplaintMatch).length / n : 0;
  const domainEligible = results.filter((r) => r.domainMatch !== "n/a");
  const domainAgreement =
    domainEligible.length > 0 ? domainEligible.filter((r) => r.domainMatch === true).length / domainEligible.length : 0;
  const similarityEligible = results.filter((r) => r.problemStatementSimilarity !== "n/a") as (RowResult & {
    problemStatementSimilarity: number;
  })[];
  const problemStatementAgreement =
    similarityEligible.length > 0
      ? similarityEligible.filter((r) => r.problemStatementSimilarity >= PROBLEM_STATEMENT_SIMILARITY_FLOOR).length /
        similarityEligible.length
      : 0;

  console.log("\n=== Classifier parity report (Ollama vs OpenRouter) ===");
  console.table([
    {
      sampled: n,
      errors: errors.length,
      isComplaintAgreement: `${(isComplaintAgreement * 100).toFixed(1)}%`,
      domainAgreement: domainEligible.length > 0 ? `${(domainAgreement * 100).toFixed(1)}% (n=${domainEligible.length})` : "n/a",
      problemStatementAgreement:
        similarityEligible.length > 0
          ? `${(problemStatementAgreement * 100).toFixed(1)}% (n=${similarityEligible.length}, >=${PROBLEM_STATEMENT_SIMILARITY_FLOOR})`
          : "n/a",
    },
  ]);

  const mismatches = results.filter((r) => !r.isComplaintMatch || r.domainMatch === false);
  if (mismatches.length > 0) {
    console.log("\nMismatches (for manual review):");
    console.table(
      mismatches.map((r) => ({
        signalId: r.signalId,
        openrouter: `complaint=${r.openrouterIsComplaint} domain=${r.openrouterDomain ?? "-"}`,
        ollama: `complaint=${r.ollamaIsComplaint} domain=${r.ollamaDomain ?? "-"}`,
      })),
    );
  }
  if (errors.length > 0) console.log("\nErrors (first 10):", errors.slice(0, 10));

  console.log(
    `\n${isComplaintAgreement >= 0.9 ? "PASS" : "FAIL"}: isComplaint agreement ${(isComplaintAgreement * 100).toFixed(1)}% (target >90%)`,
  );
  console.log(
    `${domainAgreement >= 0.8 ? "PASS" : "FAIL"}: domain agreement ${(domainAgreement * 100).toFixed(1)}% (target >80%)`,
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
