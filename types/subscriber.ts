export interface Subscriber {
  id: string; // uuid
  email: string;
  userId?: string; // uuid, links to auth.users once they've signed in (Phase 4 Part B2)
  razorpaySubscriptionId?: string;
  tier: "free" | "builder" | "studio";
  status: "active" | "past_due" | "cancelled";
  tierRenewsAt?: string; // ISO datetime
  gracePeriodEndsAt?: string; // ISO datetime
}
