/**
 * Runs the GitHub poller and inserts results into raw_signals. Ad-hoc harness
 * so we can validate the poller outside the cron route.
 */
import { config } from "dotenv";
config({ path: ".env.local" });
import { createClient } from "@supabase/supabase-js";
import { pollGithubIssues } from "../lib/ingest/pollers/github-issues";

async function main() {
  const signals = await pollGithubIssues();
  console.log(`Fetched ${signals.length} github signals.`);
  for (const s of signals.slice(0, 5)) {
    console.log(`  [${s.engagementMetric}] ${s.title} — ${s.url}`);
  }

  if (signals.length === 0) {
    console.log("No signals to insert.");
    return;
  }

  const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });
  const { data, error } = await sb
    .from("raw_signals")
    .upsert(
      signals.map((s) => ({
        source: s.source,
        url: s.url,
        title: s.title,
        text: s.text,
        author: s.author,
        engagement_metric: s.engagementMetric,
        posted_at: s.postedAt,
      })),
      { onConflict: "url", ignoreDuplicates: true },
    )
    .select("id");
  if (error) throw error;
  console.log(`Inserted ${data?.length ?? 0} new rows.`);
}
main().catch((e) => { console.error(e); process.exit(1); });
