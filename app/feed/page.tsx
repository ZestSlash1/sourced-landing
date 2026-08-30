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

export const dynamic = "force-dynamic";

const FEED_DESCRIPTION =
  "Browse Sourced's feed of validated startup ideas — real problems people already complain about, backed by evidence, ready to build.";

export const metadata: Metadata = {
  title: "Feed",
  description: FEED_DESCRIPTION,
  alternates: { canonical: "/feed" },
  openGraph: {
    type: "website",
    title: "Feed | Sourced",
    description: FEED_DESCRIPTION,
    url: absoluteUrl("/feed"),
  },
  twitter: {
    card: "summary_large_image",
    title: "Feed | Sourced",
    description: FEED_DESCRIPTION,
  },
};

const COVERS = ["cover-1", "cover-2", "cover-3", "cover-4", "cover-5", "cover-6"];

export default async function FeedPage() {
  const viewer = await resolveViewerContext();

  const user = await getCurrentUser();
  let topics: string[] = [];
  if (user) {
    const subscriber = await getSubscriberByUserId(user.id);
    if (subscriber) topics = await getSubscriberTopics(subscriber.id);
  }

  const ideas = topics.length > 0 ? await listPublishedIdeas(topics) : await listFeaturedIdeas();
  const alreadyUnlocked = viewer.subscriberId ? await unlockedIdeaIds(viewer.subscriberId) : new Set<string>();
  const access = await Promise.all(ideas.map((idea) => previewAccess(idea, viewer, alreadyUnlocked)));
  const triangulationByIdeaId = await getTriangulationMap(ideas);

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
          : "The admin-curated set — pick topics in your account to personalize this."}
      </p>
      <Link href="/methodology" className="feed-methodology-link">
        How are these sourced? →
      </Link>

      {access.length === 0 ? (
        <div className="empty-state">New ideas drop every Monday — check back soon.</div>
      ) : (
        <div className="feed-grid">
          {access.map((result, i) => {
            const idea = result.idea;
            const triangulation = triangulationByIdeaId.get(idea.id);
            const badge =
              result.kind === "tier-locked" ? (
                <span className="feed-badge">🔒 {idea.tier}+</span>
              ) : result.kind === "quota-locked" ? (
                <span className="feed-badge">⏳ Limit reached</span>
              ) : result.kind === "signed-out" ? (
                <span className="feed-badge">🔒 Sign in</span>
              ) : null;

            const href =
              result.kind === "tier-locked"
                ? "/#pricing"
                : result.kind === "quota-locked"
                  ? "/account"
                  : `/feed/${idea.slug}`;

            return (
              <Link key={idea.id} href={href} className="feed-card">
                <div className={`feed-card-cover ${COVERS[i % COVERS.length]}`}>
                  <span className="tag">{idea.category}</span>
                  <span className="score">{idea.demandScore}% demand</span>
                </div>
                <div className="feed-card-body">
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
                    <h3>{idea.title}</h3>
                    {badge}
                  </div>
                  <p>{idea.problem.summary}</p>
                  {triangulation ? (
                    <div style={{ marginTop: 10 }}>
                      <TriangulationBadge stats={triangulation.stats} />
                    </div>
                  ) : null}
                </div>
              </Link>
            );
          })}
        </div>
      )}
      <section className="newsletter-inline" aria-labelledby="feed-newsletter-heading">
        <h2 id="feed-newsletter-heading">Get the next proof drop</h2>
        <p>One evidence-backed opportunity each week.</p>
        <NewsletterForm sourcePath="/feed" />
      </section>
    </main>
  );
}
