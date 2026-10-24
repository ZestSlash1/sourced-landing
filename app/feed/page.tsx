import Link from "next/link";
import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/auth/current-user";
import { listPublishedIdeas } from "@/lib/idea-drops/repository";
import { unlockedIdeaIds } from "@/lib/idea-drops/quota";
import { previewAccess, resolveViewerContext } from "@/lib/idea-drops/resolve-access";
import { getTriangulationMap } from "@/lib/idea-drops/triangulation";
import { getSubscriberByUserId } from "@/lib/subscriptions/store";
import { getSubscriberTopics } from "@/lib/subscriptions/subscriber-topics";
import { absoluteUrl } from "@/lib/seo";
import NewsletterForm from "../newsletter-form";
import FeedBrowser, { type FeedCardData } from "@/components/feed-browser";

export const dynamic = "force-dynamic";

const FEED_DESCRIPTION =
  "Browse Sourced's feed of startup ideas to investigate: linked complaints, scoped build briefs, and practical validation steps.";

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
      estimatedHours: "difficulty" in idea ? idea.difficulty?.estimatedHours : undefined,
      skillFloor: "difficulty" in idea ? idea.difficulty?.skillFloor : undefined,
      signalCount: triangulation?.stats?.signalCount ?? idea.evidence?.length ?? 0,
      kind: result.kind,
      triangulationStats: triangulation?.stats,
    };
  });

  return (
    <main className="app-shell" style={{ maxWidth: 980, margin: "0 auto", padding: "88px 24px 80px" }}>
      {/* Top Navigation & Status Bar */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 12,
          marginBottom: 20,
        }}
      >
        <Link
          href="/"
          className="back-link"
          style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13 }}
        >
          <span>←</span> Back to Sourced
        </Link>
        <Link
          href="/methodology"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 7,
            padding: "5px 12px",
            borderRadius: "var(--r-chip)",
            border: "1px solid var(--line)",
            background: "var(--surface)",
            color: "var(--ink-soft)",
            fontSize: 12,
            textDecoration: "none",
            transition: "border-color 0.15s ease, color 0.15s ease",
          }}
        >
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#10B981" }} />
          <span>12 Poller Sources & Methodology →</span>
        </Link>
      </div>

      {/* Editorial Masthead */}
      <div
        style={{
          borderBottom: "1px solid var(--line)",
          paddingBottom: 24,
          marginBottom: 8,
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: 16 }}>
          <div>
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                fontFamily: "var(--font-jetbrains-mono), monospace",
                fontSize: 11,
                fontWeight: 600,
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                color: "var(--violet-deep)",
                marginBottom: 8,
              }}
            >
              <span>Weekly Intelligence Catalog</span>
              <span style={{ color: "var(--line)" }}>•</span>
              <span style={{ color: "var(--ink-soft)" }}>Cluster Threshold 0.74</span>
            </div>
            <h1 className="app-title display" style={{ fontSize: "clamp(28px, 4vw, 36px)", margin: "0 0 8px" }}>
              Startup Research Feed
            </h1>
            <p className="app-sub" style={{ margin: 0, maxWidth: 640 }}>
              {topics.length > 0
                ? "Filtered to your picked interest topics. Real complaints cross-verified across developer platforms with turnkey build loops."
                : "Published research briefs mined from real user complaints. Filter by category, difficulty floor, or weekend scope."}
            </p>
          </div>

          {/* Quick Metrics Strip */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              background: "var(--surface)",
              border: "1px solid var(--line)",
              borderRadius: "var(--r-md)",
              padding: "10px 16px",
              fontSize: 12.5,
              color: "var(--ink-soft)",
            }}
          >
            <div>
              <span style={{ color: "var(--ink)", fontWeight: 700, fontFamily: "var(--font-jetbrains-mono), monospace", fontSize: 14 }}>
                {ideas.length}
              </span>{" "}
              <span>Drops</span>
            </div>
            <div style={{ width: 1, height: 16, background: "var(--line)" }} />
            <div>
              {topics.length > 0 ? (
                <Link href="/account/topics" style={{ color: "var(--violet-deep)", textDecoration: "none", fontWeight: 600 }}>
                  {topics.length} topic{topics.length === 1 ? "" : "s"} active
                </Link>
              ) : (
                <Link href="/account/topics" style={{ color: "var(--ink-soft)", textDecoration: "none" }}>
                  All topics active
                </Link>
              )}
            </div>
          </div>
        </div>

        {/* Refined Research Transparency Note Bar */}
        <div
          style={{
            marginTop: 20,
            padding: "12px 18px",
            borderRadius: "var(--r-md)",
            background: "rgba(124, 58, 237, 0.06)",
            border: "1px solid rgba(124, 58, 237, 0.2)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 12,
            fontSize: 12.5,
            color: "var(--ink-soft)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                padding: "2px 8px",
                borderRadius: 4,
                background: "rgba(124, 58, 237, 0.2)",
                color: "var(--violet-deep)",
                fontFamily: "var(--font-jetbrains-mono), monospace",
                fontSize: 10.5,
                fontWeight: 700,
                letterSpacing: "0.04em",
              }}
            >
              RESEARCH PROTOCOL
            </span>
            <span>
              Complaints are research leads, not proof of willingness to pay. Always test buyer willingness before writing code.
            </span>
          </div>
          <Link
            href="/#sample"
            style={{
              color: "var(--violet-deep)",
              fontWeight: 600,
              textDecoration: "none",
              whiteSpace: "nowrap",
            }}
          >
            Read complete free sample →
          </Link>
        </div>
      </div>

      <FeedBrowser items={cardItems} />

      <section
        className="newsletter-inline"
        aria-labelledby="feed-newsletter-heading"
        style={{
          marginTop: 48,
          background: "var(--surface)",
          border: "1px solid var(--line)",
          borderRadius: "var(--r-lg)",
          padding: "32px",
          boxShadow: "var(--shadow)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 16 }}>
          <div>
            <h2 id="feed-newsletter-heading" style={{ margin: "0 0 6px" }}>
              Get the next verified proof drop
            </h2>
            <p style={{ margin: 0, color: "var(--ink-soft)", fontSize: 14 }}>
              One evidence-backed micro-SaaS opportunity with turnkey build brief shipped each week.
            </p>
          </div>
        </div>
        <div style={{ marginTop: 20 }}>
          <NewsletterForm sourcePath="/feed" />
        </div>
      </section>
    </main>
  );
}
