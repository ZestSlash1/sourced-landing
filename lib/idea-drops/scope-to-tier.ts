import type { IdeaDrop, IdeaDropTeaser } from "@/types/idea-drop";

const TIER_RANK = { free: 0, builder: 1, studio: 2 } as const;

export type UserTier = keyof typeof TIER_RANK;

/**
 * Narrows an idea to what `userTier` is entitled to see.
 *
 * Under-tier callers get the teaser: the gated fields are rebuilt by omission
 * rather than deleted or nulled, so they are absent from the serialized
 * response and the shape of paid content cannot be inferred from the network
 * tab. Must run server-side (API route handler) — never in a client component.
 */
export function scopeToTier(
  idea: IdeaDrop,
  userTier: UserTier,
): IdeaDrop | IdeaDropTeaser {
  const canViewFull = TIER_RANK[userTier] >= TIER_RANK[idea.tier];
  if (canViewFull) return idea;

  return toTeaser(idea);
}

/**
 * The always-visible slice of an idea, used both for tier gating above and
 * for quota gating (lib/idea-drops/quota.ts) — a tier-eligible idea a
 * subscriber is out of quota for still only shows this much. Problem and
 * evidence are public in full regardless of tier/quota; only build brief,
 * matched APIs, launch stack, and agent prompts are actually gated.
 */
export function toTeaser(idea: IdeaDrop): IdeaDropTeaser {
  return {
    id: idea.id,
    slug: idea.slug,
    title: idea.title,
    category: idea.category,
    demandScore: idea.demandScore,
    tags: idea.tags,
    publishedAt: idea.publishedAt,
    tier: idea.tier,
    problem: idea.problem,
    status: idea.status,
    evidence: idea.evidence,
    locked: true,
  };
}
