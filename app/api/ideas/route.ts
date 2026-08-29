import { NextResponse } from "next/server";
import { listFeaturedIdeas, listPublishedIdeas } from "@/lib/idea-drops/repository";
import { unlockedIdeaIds } from "@/lib/idea-drops/quota";
import { previewAccess, resolveViewerContext } from "@/lib/idea-drops/resolve-access";
import { getSubscriberTopics } from "@/lib/subscriptions/subscriber-topics";

// Reads the session (cookies) and hits Supabase on every request — never
// static. Without this, `next build` tries to prerender it at build time
// and fails hard if Supabase env vars aren't present in that environment
// (see the Vercel preview build failure this fixed).
export const dynamic = "force-dynamic";

/**
 * GET /api/ideas — the personalized, tier-and-quota-gated feed (Phase 4 Part C/D).
 * Signed-in users with topics selected get those topics only; everyone
 * else (logged out, or signed in with no topics picked yet) gets the
 * admin-curated "featured" set. A read-only pass — never spends anyone's
 * monthly full-idea quota (lib/idea-drops/resolve-access.ts's previewAccess).
 */
export async function GET() {
  const viewer = await resolveViewerContext();

  let topics: string[] = [];
  if (viewer.subscriberId) {
    topics = await getSubscriberTopics(viewer.subscriberId);
  }

  const ideas = topics.length > 0 ? await listPublishedIdeas(topics) : await listFeaturedIdeas();
  const alreadyUnlocked = viewer.subscriberId ? await unlockedIdeaIds(viewer.subscriberId) : new Set<string>();
  const access = await Promise.all(ideas.map((idea) => previewAccess(idea, viewer, alreadyUnlocked)));

  return NextResponse.json(access.map((a) => a.idea));
}
