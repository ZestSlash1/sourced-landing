import type { UserTier } from "./scope-to-tier";

const VALID_TIERS: readonly UserTier[] = ["free", "builder", "studio"];

/**
 * PLACEHOLDER — there is no session/auth system in this repo yet (payments
 * ticket 01 stops at writing to a `subscribers` table by email; there is no
 * login, session, or cookie). Reads tier from a `?tier=` query param so the
 * gating routes are testable end-to-end today.
 *
 * Replace this once auth exists: resolve the request's session/email, look
 * up `subscribers.plan` (or default "free" if no active row), and delete the
 * query-param path entirely — a `?tier=studio` in the URL must not be able
 * to unlock paid content in production.
 */
export function resolveUserTier(request: Request): UserTier {
  const tier = new URL(request.url).searchParams.get("tier");
  if (tier && (VALID_TIERS as string[]).includes(tier)) {
    return tier as UserTier;
  }
  return "free";
}
