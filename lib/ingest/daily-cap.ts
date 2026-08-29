import "server-only";
import { getSupabaseServerClient } from "@/lib/supabase/server";

/**
 * Daily LLM-draft cap (Decision #3): 8/day, keeps the pending-review queue
 * reviewable in a few minutes and the Claude API bill predictable.
 */
export const DAILY_DRAFT_CAP = 8;

/** How many ingest-originated drafts (source_signal_ids not null) were created today. */
export async function draftsCreatedToday(): Promise<number> {
  const supabase = getSupabaseServerClient();
  const startOfDay = new Date();
  startOfDay.setUTCHours(0, 0, 0, 0);

  const { count, error } = await supabase
    .from("idea_drops")
    .select("id", { count: "exact", head: true })
    .not("source_signal_ids", "is", null)
    .gte("created_at", startOfDay.toISOString());

  if (error) throw new Error(`draftsCreatedToday: ${error.message}`);
  return count ?? 0;
}
