export type Tier = "free" | "builder" | "studio";
export type SubscriptionStatus = "active" | "past_due" | "cancelled";

export interface Subscriber {
  email: string;
  razorpaySubscriptionId?: string;
  tier: Tier;
  tierRenewsAt?: string; // ISO date — last known renewal/paid-through date
  status: SubscriptionStatus;
  pastDueSince?: string; // ISO date — start of the current past_due grace window
}
