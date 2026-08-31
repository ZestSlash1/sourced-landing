/**
 * One-time backfill: runs the competitive gap check
 * (lib/ingest/competitive-landscape.ts) against every published idea_drops
 * row missing one, so older ideas don't look unfinished next to newer ones
 * that got the check at draft time (sourced-competitive-gap-spec.md
 * "Retroactive application"). Same real-search-only guarantee as the
 * pipeline stage — a failed/uncited search leaves the row untouched rather
 * than writing a fabricated verdict.
 */
import { config } from "dotenv";
config({ path: ".env.local" });
import { createClient } from "@supabase/supabase-js";
import { checkCompetitiveLandscape } from "../lib/ingest/competitive-landscape";

async function main() {
  const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false },
  });

  const { data, error } = await sb
    .from("idea_drops")
    .select("id, problem, competitive_landscape")
    .eq("status", "published")
    .is("competitive_landscape", null);
  if (error) throw error;

  const rows = (data ?? []) as { id: string; problem: { summary: string }; competitive_landscape: unknown }[];
  console.log(`${rows.length} published idea(s) missing a competitive landscape check.`);

  let checked = 0;
  let costUsd = 0;
  const errors: string[] = [];

  for (const row of rows) {
    try {
      const { result, costUsd: cost } = await checkCompetitiveLandscape(row.problem.summary);
      const { error: updateError } = await sb
        .from("idea_drops")
        .update({ competitive_landscape: result })
        .eq("id", row.id);
      if (updateError) throw new Error(updateError.message);
      checked++;
      costUsd += cost;
      console.log(`  ${row.id}: ${result.verdict} (${result.existingSolutions.length} solution(s))`);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      errors.push(`${row.id}: ${message}`);
      console.log(`  ${row.id}: FAILED — ${message}`);
    }
  }

  console.log(`Checked: ${checked}/${rows.length}  Est. cost: $${costUsd.toFixed(4)}`);
  if (errors.length > 0) {
    console.log(`Errors (${errors.length}) — these rows still have no competitive_landscape:`);
    for (const e of errors) console.log(`  ${e}`);
  }
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
