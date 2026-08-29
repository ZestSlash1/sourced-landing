import "server-only";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import type { UserTier } from "./scope-to-tier";

const TABLE = "idea_drop_views";

/** Full ideas a subscriber may newly unlock per calendar month. `null` = unlimited. */
export const MONTHLY_FULL_VIEW_QUOTA: Record<UserTier, number | null> = {
  free: 1,
  builder: 4,
  studio: null,
};

function startOfCurrentMonthIso(): string {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();
}

/** The first day of next month, for "resets on" messaging. */
export function nextQuotaResetIso(): string {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1)).toISOString();
}

/** Whether `subscriberId` has already unlocked `ideaId` — a prior unlock is free to revisit, any month. */
export async function hasUnlockedIdea(subscriberId: string, ideaId: string): Promise<boolean> {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from(TABLE)
    .select("idea_id")
    .eq("subscriber_id", subscriberId)
    .eq("idea_id", ideaId)
    .maybeSingle();

  if (error) throw new Error(`hasUnlockedIdea: ${error.message}`);
  return data !== null;
}

/** Every idea id `subscriberId` has ever unlocked — for scoping a list of ideas in one query. */
export async function unlockedIdeaIds(subscriberId: string): Promise<Set<string>> {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase.from(TABLE).select("idea_id").eq("subscriber_id", subscriberId);

  if (error) throw new Error(`unlockedIdeaIds: ${error.message}`);
  return new Set((data ?? []).map((row) => row.idea_id as string));
}

/** How many distinct ideas `subscriberId` has newly unlocked since the start of the current calendar month (UTC). */
export async function unlockedThisMonth(subscriberId: string): Promise<number> {
  const supabase = getSupabaseServerClient();
  const { count, error } = await supabase
    .from(TABLE)
    .select("idea_id", { count: "exact", head: true })
    .eq("subscriber_id", subscriberId)
    .gte("viewed_at", startOfCurrentMonthIso());

  if (error) throw new Error(`unlockedThisMonth: ${error.message}`);
  return count ?? 0;
}

/**
 * Records a first-time unlock. A no-op if already recorded (the primary key
 * on (subscriber_id, idea_id) makes a duplicate call harmless), so callers
 * never need to check `hasUnlockedIdea` first just to avoid double-counting.
 */
export async function recordUnlock(subscriberId: string, ideaId: string): Promise<void> {
  const supabase = getSupabaseServerClient();
  const { error } = await supabase
    .from(TABLE)
    .upsert(
      { subscriber_id: subscriberId, idea_id: ideaId },
      { onConflict: "subscriber_id,idea_id", ignoreDuplicates: true },
    );

  if (error) throw new Error(`recordUnlock: ${error.message}`);
}

export interface QuotaStatus {
  quota: number | null; // null = unlimited
  used: number;
  remaining: number | null; // null = unlimited
}

export async function getQuotaStatus(subscriberId: string, tier: UserTier): Promise<QuotaStatus> {
  const quota = MONTHLY_FULL_VIEW_QUOTA[tier];
  if (quota === null) return { quota: null, used: 0, remaining: null };

  const used = await unlockedThisMonth(subscriberId);
  return { quota, used, remaining: Math.max(0, quota - used) };
}

/** Whether `subscriberId` may view `ideaId` in full right now, without recording anything. */
export async function canUnlockIdea(
  subscriberId: string,
  ideaId: string,
  tier: UserTier,
): Promise<{ allowed: boolean; status: QuotaStatus }> {
  const status = await getQuotaStatus(subscriberId, tier);
  if (status.quota === null) return { allowed: true, status };
  if (await hasUnlockedIdea(subscriberId, ideaId)) return { allowed: true, status };
  return { allowed: status.used < status.quota, status };
}
