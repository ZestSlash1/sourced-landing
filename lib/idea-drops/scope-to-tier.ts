import type { IdeaDrop, IdeaDropTeaser } from "@/types/idea-drop";

const TIER_RANK = { free: 0, builder: 1, studio: 2 } as const;

export function scopeToTier(
  idea: IdeaDrop,
  userTier: keyof typeof TIER_RANK
): IdeaDrop | IdeaDropTeaser {
  const canViewFull = TIER_RANK[userTier] >= TIER_RANK[idea.tier];
  if (canViewFull) return idea;

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
    evidence: idea.evidence.slice(0, 1),
    locked: true,
  };
}
