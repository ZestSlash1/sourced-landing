import "server-only";
import { getCurrentUser } from "@/lib/auth/current-user";
import { getOrCreateSubscriberForUser } from "@/lib/subscriptions/store";
import type { Subscriber } from "@/types/subscriber";

export type UserCheck = { ok: true; subscriber: Subscriber } | { ok: false; status: 401 };

/**
 * Guard for customer-only routes/pages (account settings, topic picker) —
 * the customer equivalent of lib/auth/require-admin.ts. Bootstraps the
 * subscribers row on first call after sign-in, so callers never have to
 * think about "signed in but no subscriber row yet".
 */
export async function requireUser(): Promise<UserCheck> {
  const user = await getCurrentUser();
  if (!user || !user.email) return { ok: false, status: 401 };

  const subscriber = await getOrCreateSubscriberForUser(user.id, user.email);
  return { ok: true, subscriber };
}
