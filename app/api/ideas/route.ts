import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/current-user";
import {
  listFeaturedIdeas,
  listPublishedIdeas,
} from "@/lib/idea-drops/repository";
import { resolveUserTier } from "@/lib/idea-drops/resolve-user-tier";
import { scopeToTier } from "@/lib/idea-drops/scope-to-tier";
import { getSubscriberByUserId } from "@/lib/subscriptions/store";
import { getSubscriberTopics } from "@/lib/subscriptions/subscriber-topics";

/**
 * GET /api/ideas — the personalized, tier-gated feed (Phase 4 Part C).
 * Signed-in users with topics selected get those topics only; everyone
 * else (logged out, or signed in with no topics picked yet) gets the
 * admin-curated "featured" set.
 */
export async function GET() {
  const userTier = await resolveUserTier();

  const user = await getCurrentUser();
  let topics: string[] = [];
  if (user) {
    const subscriber = await getSubscriberByUserId(user.id);
    if (subscriber) topics = await getSubscriberTopics(subscriber.id);
  }

  const ideas = topics.length > 0 ? await listPublishedIdeas(topics) : await listFeaturedIdeas();
  const scoped = ideas.map((idea) => scopeToTier(idea, userTier));
  return NextResponse.json(scoped);
}
