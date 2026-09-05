import Link from "next/link";
import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/auth/current-user";
import { listFeaturedIdeas, listPublishedIdeas } from "@/lib/idea-drops/repository";
import { unlockedIdeaIds } from "@/lib/idea-drops/quota";
import { previewAccess, resolveViewerContext } from "@/lib/idea-drops/resolve-access";
import { getTriangulationMap } from "@/lib/idea-drops/triangulation";
import { getSubscriberByUserId } from "@/lib/subscriptions/store";
import { getSubscriberTopics } from "@/lib/subscriptions/subscriber-topics";
import { absoluteUrl } from "@/lib/seo";
import TriangulationBadge from "./triangulation-badge";
import NewsletterForm from "../newsletter-form";
import FeedBrowser, { type FeedCardData } from "@/components/feed-browser";

export const dynamic = "force-dynamic";

const FEED_DESCRIPTION =
  "Browse Sourced's feed of validated startup ideas: real problems people already complain about, backed by evidence, ready to build.";

export const metadata: Metadata = {
  title: "Startup Idea Feed",
  description: FEED_DESCRIPTION,
  alternates: { canonical: "/feed" },
  openGraph: {
    type: "website",
    title: "Startup Idea Feed | Sourced",
    description: FEED_DESCRIPTION,
    url: absoluteUrl("/feed"),
  },
  twitter: {
    card: "summary_large_image",
    title: "Startup Idea Feed | Sourced",
    description: FEED_DESCRIPTION,
  },
};

export default async function FeedPage() {
  const viewer = await resolveViewerContext();

  const user = await getCurrentUser();
  let topics: string[] = [];
  if (user) {
    const subscriber = await getSubscriberByUserId(user.id);
    if (subscriber) topics = await getSubscriberTopics(subscriber.id);
  }

  const ideas = await listPublishedIdeas(topics.length > 0 ? topics : undefined);
  const alreadyUnlocked = viewer.subscriberId ? await unlockedIdeaIds(viewer.subscriberId) : new Set<string>();
  const access = await Promise.all(ideas.map((idea) => previewAccess(idea, viewer, alreadyUnlocked)));
  const triangulationByIdeaId = await getTriangulationMap(ideas);

  const cardItems: FeedCardData[] = access.map((result) => {
    const idea = result.idea;
    const triangulation = triangulationByIdeaId.get(idea.id);
    return {
      id: idea.id,
      slug: idea.slug,
      title: idea.title,
      category: idea.category,
      demandScore: idea.demandScore,
      problemSummary: idea.problem.summary,
      tier: idea.tier,
      soloWeekendProject: "difficulty" in idea ? Boolean(idea.difficulty?.soloWeekendProject) : false,
      kind: result.kind,
      triangulationStats: triangulation?.stats,
    };
  });

  return (
    <main className="app-shell">
      <div className="app-header">
        <h1 className="app-title display">Feed</h1>
        <Link href="/" className="back-link">
          ← Back to Sourced
        </Link>
      </div>
      <p className="app-sub">
        {topics.length > 0
          ? "Filtered to your picked topics."
          : "All published validated drops. Filter by category, stack, or weekend scope."}
      </p>
      <Link href="/methodology" className="feed-methodology-link">
        How are these sourced? →
      </Link>

      <FeedBrowser items={cardItems} />
      <section className="newsletter-inline" aria-labelledby="feed-newsletter-heading">
        <h2 id="feed-newsletter-heading">Get the next proof drop</h2>
        <p>One evidence-backed opportunity each week.</p>
        <NewsletterForm sourcePath="/feed" />
      </section>
    </main>
  );
}
