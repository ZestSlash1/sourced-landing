import "server-only";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { isTopic, type Topic } from "@/lib/topics";

const TABLE = "subscriber_topics";

/** The topics a subscriber has selected (Phase 4 Part B4), unordered. */
export async function getSubscriberTopics(subscriberId: string): Promise<Topic[]> {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase.from(TABLE).select("topic").eq("subscriber_id", subscriberId);

  if (error) throw new Error(`getSubscriberTopics: ${error.message}`);
  return (data as { topic: string }[]).map((row) => row.topic).filter(isTopic);
}

/**
 * Replaces a subscriber's topic selection wholesale (the account settings
 * picker sends the full set each save, not a diff). Silently drops any
 * value outside the fixed TOPICS list rather than erroring, since that list
 * can change and stale client state shouldn't 500 the save.
 */
export async function setSubscriberTopics(subscriberId: string, topics: string[]): Promise<void> {
  const valid = topics.filter(isTopic);
  const supabase = getSupabaseServerClient();

  const { error: deleteError } = await supabase.from(TABLE).delete().eq("subscriber_id", subscriberId);
  if (deleteError) throw new Error(`setSubscriberTopics (clear): ${deleteError.message}`);

  if (valid.length === 0) return;

  const { error: insertError } = await supabase
    .from(TABLE)
    .insert(valid.map((topic) => ({ subscriber_id: subscriberId, topic })));
  if (insertError) throw new Error(`setSubscriberTopics (insert): ${insertError.message}`);
}
