import "server-only";
import { getSupabaseServerClient } from "@/lib/supabase/server";

/** "The first 100 subscribers keep ₹310/mo on Builder for life." */
export const FOUNDING_SLOTS = 100;
export const FOUNDING_PRICE_INR = 310;
export const STANDARD_BUILDER_PRICE_INR = 399;

/**
 * Counts distinct Razorpay subscriptions that have ever been confirmed paid
 * (subscription.activated/charged webhook fired at least once), across all
 * plans and tiers. Read from `events` rather than `sourced_subscribers.tier`
 * because tier resets to "free" on cancellation — the founding count must
 * stay permanent ("for life", not "while still subscribed").
 *
 * The webhook tracks checkout_completed with sessionId `webhook:<subscriptionId>`
 * on every charge (including recurring renewals), so counting distinct
 * session ids counts distinct subscriptions, not events.
 */
export async function foundingSlotsRemaining(): Promise<number> {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("events")
    .select("session_id")
    .eq("event_type", "checkout_completed");

  if (error) throw new Error(`foundingSlotsRemaining: ${error.message}`);

  const distinctSubscriptions = new Set((data ?? []).map((row) => row.session_id as string)).size;
  return Math.max(0, FOUNDING_SLOTS - distinctSubscriptions);
}
