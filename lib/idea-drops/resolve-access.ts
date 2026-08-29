import { getCurrentUser } from "@/lib/auth/current-user";
import { getSubscriberByUserId } from "@/lib/subscriptions/store";
import type { IdeaDrop, IdeaDropTeaser } from "@/types/idea-drop";
import { canUnlockIdea, getQuotaStatus, recordUnlock, type QuotaStatus } from "./quota";
import { resolveUserTier } from "./resolve-user-tier";
import { scopeToTier, toTeaser, type UserTier } from "./scope-to-tier";

export interface ViewerContext {
  subscriberId: string | null;
  tier: UserTier;
}

/** The signed-in subscriber (if any) and their tier, in one call — both list and detail pages need this pair. */
export async function resolveViewerContext(): Promise<ViewerContext> {
  const tier = await resolveUserTier();
  const user = await getCurrentUser();
  if (!user) return { subscriberId: null, tier };

  const subscriber = await getSubscriberByUserId(user.id);
  return { subscriberId: subscriber?.id ?? null, tier };
}

export type IdeaAccess =
  | { kind: "full"; idea: IdeaDrop }
  | { kind: "tier-locked"; idea: IdeaDropTeaser }
  | { kind: "quota-locked"; idea: IdeaDropTeaser; quota: QuotaStatus };

/**
 * Read-only check for a list view — never records an unlock, so browsing
 * the feed never spends anyone's monthly quota. Pass `alreadyUnlocked` (from
 * `unlockedIdeaIds`) once per request rather than querying per idea.
 */
export async function previewAccess(
  idea: IdeaDrop,
  viewer: ViewerContext,
  alreadyUnlocked: Set<string>,
): Promise<IdeaAccess> {
  const scoped = scopeToTier(idea, viewer.tier);
  if ("locked" in scoped && scoped.locked) {
    return { kind: "tier-locked", idea: scoped };
  }

  // Anonymous visitors are never metered — there's no identity to track quota against.
  if (!viewer.subscriberId) {
    return { kind: "full", idea: scoped as IdeaDrop };
  }

  if (alreadyUnlocked.has(idea.id)) {
    return { kind: "full", idea: scoped as IdeaDrop };
  }

  const quota = await getQuotaStatus(viewer.subscriberId, viewer.tier);
  if (quota.remaining === null || quota.remaining > 0) {
    return { kind: "full", idea: scoped as IdeaDrop };
  }

  return { kind: "quota-locked", idea: toTeaser(idea), quota };
}

/**
 * Access check for the detail page — the only call site that records an
 * unlock. Grants full access and records it when the subscriber is
 * tier-eligible and (already unlocked or under quota); otherwise returns the
 * teaser without touching the quota.
 */
export async function resolveAndRecordAccess(idea: IdeaDrop, viewer: ViewerContext): Promise<IdeaAccess> {
  const scoped = scopeToTier(idea, viewer.tier);
  if ("locked" in scoped && scoped.locked) {
    return { kind: "tier-locked", idea: scoped };
  }

  if (!viewer.subscriberId) {
    return { kind: "full", idea: scoped as IdeaDrop };
  }

  const { allowed, status } = await canUnlockIdea(viewer.subscriberId, idea.id, viewer.tier);
  if (!allowed) {
    return { kind: "quota-locked", idea: toTeaser(idea), quota: status };
  }

  await recordUnlock(viewer.subscriberId, idea.id);
  return { kind: "full", idea: scoped as IdeaDrop };
}
