import { getCurrentUser } from "@/lib/auth/current-user";
import { getSubscriberByUserId } from "@/lib/subscriptions/store";
import type { UserTier } from "./scope-to-tier";

/**
 * Resolves the caller's tier from their real session (Phase 4 Part B3),
 * replacing the old `?tier=` dev-only override now that a real subscriber
 * record exists to look up.
 *
 * Logged-out visitors, and signed-in users with no subscribers row yet
 * (shouldn't happen post-B2, but this stays defensive), get "free" — never
 * an error, since this runs on every public idea read.
 */
export async function resolveUserTier(): Promise<UserTier> {
  const user = await getCurrentUser();
  if (!user) return "free";

  const subscriber = await getSubscriberByUserId(user.id);
  if (!subscriber || subscriber.status !== "active") return "free";

  return subscriber.tier;
}
