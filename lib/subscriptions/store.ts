import "server-only";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { notify } from "@/lib/notify";
import { track } from "@/lib/track";
import type { Subscriber } from "@/types/subscriber";
import { rowToSubscriber, subscriberToRow, type SubscriberRow } from "./mapping";

// Named sourced_subscribers, not subscribers — this Supabase instance is
// shared across projects and already had an unrelated table named
// "subscribers" (see supabase/migrations/0008_rename_to_sourced_subscribers.sql).
const TABLE = "sourced_subscribers";

/** A subscriber by email, or null if none exists yet. */
export async function getSubscriberByEmail(email: string): Promise<Subscriber | null> {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from(TABLE)
    .select("*")
    .eq("email", email)
    .maybeSingle();

  if (error) throw new Error(`getSubscriberByEmail: ${error.message}`);
  if (!data) return null;
  return rowToSubscriber(data as SubscriberRow);
}

/** A subscriber by their Supabase Auth user id, or null if none exists yet. */
export async function getSubscriberByUserId(userId: string): Promise<Subscriber | null> {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from(TABLE)
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw new Error(`getSubscriberByUserId: ${error.message}`);
  if (!data) return null;
  return rowToSubscriber(data as SubscriberRow);
}

/**
 * First-login bootstrap (Phase 4 Part B2): links a signed-in auth user to a
 * `sourced_subscribers` row, creating one with `tier = 'free'` if this is their
 * first time. If a row already exists for their email (e.g. seeded before
 * they ever signed in) it's claimed by attaching user_id, rather than
 * creating a second row for the same person.
 */
export async function getOrCreateSubscriberForUser(
  userId: string,
  email: string,
): Promise<Subscriber> {
  const existingByUserId = await getSubscriberByUserId(userId);
  if (existingByUserId) return existingByUserId;

  const supabase = getSupabaseServerClient();
  const existingByEmail = await getSubscriberByEmail(email);
  const isNewSubscriber = !existingByEmail;

  const { data, error } = await supabase
    .from(TABLE)
    .upsert(
      subscriberToRow({
        id: existingByEmail?.id,
        email,
        userId,
        tier: existingByEmail?.tier ?? "free",
        status: existingByEmail?.status ?? "active",
      }),
      { onConflict: "email" },
    )
    .select()
    .single();

  if (error) throw new Error(`getOrCreateSubscriberForUser: ${error.message}`);

  // The one true "someone signed up" moment — this function is the only
  // write path for a subscriber's first row, reached from both OAuth
  // (auth/callback) and email/password (require-user) flows, so hooking the
  // notification here (rather than in either caller) fires exactly once.
  if (isNewSubscriber) {
    // Tracked here rather than at the login form, so OAuth signups count
    // too — /admin/analytics reads "signup" as the conversion denominator,
    // and counting only the email/password form understated it.
    await track({ eventType: "signup", userId });
    await notify({ title: "New signup", message: email, tags: ["tada"] });
  }

  return rowToSubscriber(data as SubscriberRow);
}

/** A subscriber by their Razorpay subscription id, or null. Used by the webhook to find who to update. */
export async function getSubscriberByRazorpaySubscriptionId(
  subscriptionId: string,
): Promise<Subscriber | null> {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from(TABLE)
    .select("*")
    .eq("razorpay_subscription_id", subscriptionId)
    .maybeSingle();

  if (error) throw new Error(`getSubscriberByRazorpaySubscriptionId: ${error.message}`);
  if (!data) return null;
  return rowToSubscriber(data as SubscriberRow);
}

/**
 * Links a newly-created Razorpay subscription to a subscriber, ahead of
 * payment confirmation — tier stays untouched (still whatever it was) until
 * the webhook confirms the first charge, so a checkout that's opened but
 * abandoned never grants access.
 */
export async function setSubscriberRazorpaySubscription(
  subscriberId: string,
  razorpaySubscriptionId: string,
): Promise<void> {
  const supabase = getSupabaseServerClient();
  const { error } = await supabase
    .from(TABLE)
    .update({ razorpay_subscription_id: razorpaySubscriptionId })
    .eq("id", subscriberId);

  if (error) throw new Error(`setSubscriberRazorpaySubscription: ${error.message}`);
}

/** Sets a subscriber's tier/status directly — the webhook's write path on payment events. */
export async function updateSubscriberTier(
  subscriberId: string,
  tier: Subscriber["tier"],
  status: Subscriber["status"],
): Promise<void> {
  const supabase = getSupabaseServerClient();
  const { error } = await supabase.from(TABLE).update({ tier, status }).eq("id", subscriberId);

  if (error) throw new Error(`updateSubscriberTier: ${error.message}`);
}

/** Creates or updates a subscriber by email. */
export async function upsertSubscriber(
  subscriber: Partial<Subscriber> & Pick<Subscriber, "email">,
): Promise<Subscriber> {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from(TABLE)
    .upsert(subscriberToRow(subscriber), { onConflict: "email" })
    .select()
    .single();

  if (error) throw new Error(`upsertSubscriber: ${error.message}`);
  return rowToSubscriber(data as SubscriberRow);
}
