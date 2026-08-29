import { getSubscriber } from "./store";
import type { Tier } from "./types";

/** Days a `past_due` subscriber keeps their paid tier before falling back to free. */
export const PAST_DUE_GRACE_DAYS = Number(process.env.SUBSCRIPTION_GRACE_DAYS ?? 3);

/**
 * A lapsed subscription falls back to free-tier access, not an error state
 * (sourced-phase2-spec.md Task 3.3). `past_due` keeps the paid tier for
 * PAST_DUE_GRACE_DAYS from when it went past_due, then downgrades.
 * `cancelled` downgrades immediately.
 */
export function getUserTier(email: string | null | undefined): Tier {
  if (!email) return "free";
  const subscriber = getSubscriber(email);
  if (!subscriber) return "free";

  if (subscriber.status === "active") return subscriber.tier;

  if (subscriber.status === "past_due" && subscriber.pastDueSince) {
    const graceEnds = new Date(subscriber.pastDueSince);
    graceEnds.setDate(graceEnds.getDate() + PAST_DUE_GRACE_DAYS);
    if (new Date() < graceEnds) return subscriber.tier;
  }

  return "free";
}
