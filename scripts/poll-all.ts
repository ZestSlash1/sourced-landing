/**
 * Runs every keyless poller once and inserts results into raw_signals,
 * reporting fetched/inserted counts per source. Ad-hoc harness equivalent to
 * triggering each /api/cron/ingest-* route in sequence, without needing
 * CRON_SECRET or a deployed environment. Reddit is skipped — it requires
 * REDDIT_CLIENT_ID/SECRET which aren't configured.
 */
import { config } from "dotenv";
config({ path: ".env.local" });
import { createClient } from "@supabase/supabase-js";
import { pollHackerNews } from "../lib/ingest/pollers/hacker-news";
import { pollStackExchange } from "../lib/ingest/pollers/stack-exchange";
import { pollGithubIssues } from "../lib/ingest/pollers/github-issues";
import { pollDevTo } from "../lib/ingest/pollers/devto";
import { pollLobsters } from "../lib/ingest/pollers/lobsters";
import type { RawSignalInput } from "../lib/ingest/types";

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });

async function insertRawSignals(signals: RawSignalInput[]): Promise<number> {
  if (signals.length === 0) return 0;
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
  if (error) throw new Error(error.message);
  return (data as { id: string }[]).length;
}

const POLLERS: { name: string; fn: () => Promise<RawSignalInput[]> }[] = [
  { name: "hackernews", fn: pollHackerNews },
  { name: "stackexchange", fn: pollStackExchange },
  { name: "github", fn: pollGithubIssues },
  { name: "devto", fn: pollDevTo },
  { name: "lobsters", fn: pollLobsters },
];

async function main() {
  const report: { source: string; fetched: number; inserted: number; error?: string }[] = [];

  for (const { name, fn } of POLLERS) {
    try {
      const signals = await fn();
      const inserted = await insertRawSignals(signals);
      report.push({ source: name, fetched: signals.length, inserted });
      console.log(`[${name}] fetched=${signals.length} inserted=${inserted}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      report.push({ source: name, fetched: 0, inserted: 0, error: message });
      console.error(`[${name}] FAILED: ${message}`);
    }
  }

  console.log("\n=== Summary ===");
  console.table(report);
}
main().catch((e) => { console.error(e); process.exit(1); });
