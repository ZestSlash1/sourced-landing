/**
 * omniroute-drafts-and-ollama-lockin-spec.md Part 1: manual go/no-go check
 * for locking in Ollama as the sole classifier, now that OpenRouter is being
 * dropped as a required dependency (so no reason to spend OpenRouter credit
 * validating against it as ground truth). Pulls 30 signals and classifies
 * them via Ollama only, printing each for human eyeballing against the
 * tightened prompt's definition of "complaint" — no comparison logic, no
 * pass/fail threshold. Requires OLLAMA_URL to be reachable (run on falcon).
 */
import { config } from "dotenv";
config({ path: ".env.local" });
import { createClient } from "@supabase/supabase-js";
import { classifyViaOllama } from "../lib/llm/providers/ollama";

const SAMPLE_SIZE = 30;

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
  auth: { persistSession: false },
});

interface SignalRow {
  id: string;
  source: string;
  title: string | null;
  text: string;
}

function truncate(text: string, max = 300): string {
  return text.length > max ? `${text.slice(0, max)}...` : text;
}

async function fetchSample(): Promise<SignalRow[]> {
  // Prefer signals not yet classified, so this doubles as useful backfill
  // work; top up with already-classified ones (force-reclassified via Ollama
  // here, not written back to the row) if there aren't enough.
  const { data: unclassified, error: unclassifiedErr } = await sb
    .from("raw_signals")
    .select("id, source, title, text")
    .is("classified_as_complaint", null)
    .limit(SAMPLE_SIZE);
  if (unclassifiedErr) throw new Error(unclassifiedErr.message);

  const rows = (unclassified as SignalRow[]) ?? [];
  if (rows.length >= SAMPLE_SIZE) return rows.slice(0, SAMPLE_SIZE);

  const { data: rest, error: restErr } = await sb
    .from("raw_signals")
    .select("id, source, title, text")
    .not("classified_as_complaint", "is", null)
    .order("id")
    .limit(SAMPLE_SIZE - rows.length);
  if (restErr) throw new Error(restErr.message);

  return [...rows, ...((rest as SignalRow[]) ?? [])];
}

async function main() {
  if (!process.env.OLLAMA_URL) {
    throw new Error("OLLAMA_URL is not set — run this script on falcon (or wherever Ollama is reachable).");
  }

  const sample = await fetchSample();
  console.log(`Classifying ${sample.length} signal(s) via Ollama only (model: ${process.env.OLLAMA_CLASSIFIER_MODEL ?? "qwen2.5:7b-instruct"})...\n`);

  let errors = 0;
  for (let i = 0; i < sample.length; i++) {
    const row = sample[i];
    try {
      const result = await classifyViaOllama({ title: row.title, body: row.text, platform: row.source });
      console.log(`--- [${i + 1}/${sample.length}] ${row.id} (${row.source}) ---`);
      console.log(`title: ${row.title ?? "(none)"}`);
      console.log(`text: ${truncate(row.text)}`);
      console.log(`isComplaint: ${result.isComplaint}`);
      console.log(`domain: ${result.domain ?? "-"}`);
      console.log(`problemStatement: ${result.problemStatement ?? "-"}`);
      console.log(`confidence: ${result.confidence}`);
      console.log("");
    } catch (err) {
      errors++;
      console.error(`--- [${i + 1}/${sample.length}] ${row.id} FAILED: ${err instanceof Error ? err.message : err} ---\n`);
    }
  }

  console.log(`Done. ${sample.length - errors}/${sample.length} classified, ${errors} error(s).`);
  console.log(
    "Review above using the tightened prompt's definition (genuine frustration/blocked state, not just any GitHub issue " +
      "or feature request) — judge whether each classification looks right, and whether any systematic pattern shows up.",
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
