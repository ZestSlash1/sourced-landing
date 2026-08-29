import type { Subscriber } from "@/types/subscriber";

/** Shape of a row in the `subscribers` table (see supabase/migrations/0002_subscribers.sql). */
export interface SubscriberRow {
  id: string;
  email: string;
  user_id: string | null;
  razorpay_subscription_id: string | null;
  tier: Subscriber["tier"];
  status: Subscriber["status"];
  tier_renews_at: string | null;
  grace_period_ends_at: string | null;
  created_at: string;
  updated_at: string;
}

/** Row -> Subscriber. Drops audit columns and turns nullable columns into absent fields. */
export function rowToSubscriber(row: SubscriberRow): Subscriber {
  const subscriber: Subscriber = {
    id: row.id,
    email: row.email,
    tier: row.tier,
    status: row.status,
  };

  if (row.user_id !== null) {
    subscriber.userId = row.user_id;
  }
  if (row.razorpay_subscription_id !== null) {
    subscriber.razorpaySubscriptionId = row.razorpay_subscription_id;
  }
  if (row.tier_renews_at !== null) {
    subscriber.tierRenewsAt = row.tier_renews_at;
  }
  if (row.grace_period_ends_at !== null) {
    subscriber.gracePeriodEndsAt = row.grace_period_ends_at;
  }

  return subscriber;
}

/** Subscriber -> the insert/update payload for `subscribers`. */
export function subscriberToRow(
  subscriber: Partial<Subscriber> & Pick<Subscriber, "email">,
): Omit<SubscriberRow, "id" | "created_at" | "updated_at"> & { id?: string } {
  return {
    ...(subscriber.id ? { id: subscriber.id } : {}),
    email: subscriber.email,
    user_id: subscriber.userId ?? null,
    razorpay_subscription_id: subscriber.razorpaySubscriptionId ?? null,
    tier: subscriber.tier ?? "free",
    status: subscriber.status ?? "active",
    tier_renews_at: subscriber.tierRenewsAt ?? null,
    grace_period_ends_at: subscriber.gracePeriodEndsAt ?? null,
  };
}
