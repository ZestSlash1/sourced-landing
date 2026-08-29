import Link from "next/link";
import { getCurrentUser } from "@/lib/auth/current-user";
import { listFeaturedIdeas, listPublishedIdeas } from "@/lib/idea-drops/repository";
import { resolveUserTier } from "@/lib/idea-drops/resolve-user-tier";
import { scopeToTier } from "@/lib/idea-drops/scope-to-tier";
import { getSubscriberByUserId } from "@/lib/subscriptions/store";
import { getSubscriberTopics } from "@/lib/subscriptions/subscriber-topics";

export const dynamic = "force-dynamic";

export default async function FeedPage() {
  const userTier = await resolveUserTier();

  const user = await getCurrentUser();
  let topics: string[] = [];
  if (user) {
    const subscriber = await getSubscriberByUserId(user.id);
    if (subscriber) topics = await getSubscriberTopics(subscriber.id);
  }

  const ideas = topics.length > 0 ? await listPublishedIdeas(topics) : await listFeaturedIdeas();
  const scoped = ideas.map((idea) => scopeToTier(idea, userTier));

  return (
    <main style={{ maxWidth: 720, margin: "0 auto", padding: "40px 24px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
        <h1 className="display" style={{ fontSize: 24, margin: 0 }}>
          Feed
        </h1>
        <Link
          href="/"
          style={{ fontSize: 13, color: "var(--ink-soft)", textDecoration: "none" }}
        >
          ← Back to Sourced
        </Link>
      </div>
      <p style={{ color: "var(--ink-soft)", fontSize: 14, marginBottom: 28 }}>
        {topics.length > 0
          ? "Filtered to your picked topics."
          : "The admin-curated set — pick topics in your account to personalize this."}
      </p>

      {scoped.length === 0 ? (
        <div
          style={{
            border: "1px dashed var(--line)",
            borderRadius: "var(--r-sm)",
            padding: "32px 20px",
            textAlign: "center",
            color: "var(--ink-soft)",
            fontSize: 14,
          }}
        >
          New ideas drop every Monday — check back soon.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {scoped.map((idea) => {
            const locked = "locked" in idea && idea.locked;
            const card = (
              <div
                style={{
                  border: "1px solid var(--line)",
                  borderRadius: "var(--r-sm)",
                  padding: "16px 18px",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12, marginBottom: 6 }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: "var(--violet)" }}>
                    {idea.category} · {idea.demandScore}% demand
                  </span>
                  {locked && (
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 600,
                        color: "var(--ink-soft)",
                        border: "1px solid var(--line)",
                        borderRadius: 999,
                        padding: "2px 8px",
                      }}
                    >
                      🔒 {idea.tier}+
                    </span>
                  )}
                </div>
                <h3 style={{ fontSize: 16, margin: "0 0 6px" }}>{idea.title}</h3>
                <p style={{ fontSize: 14, color: "var(--ink-soft)", margin: 0 }}>
                  {idea.problem.summary}
                </p>
              </div>
            );

            return locked ? (
              <Link key={idea.id} href="/#pricing" style={{ textDecoration: "none", color: "inherit" }}>
                {card}
              </Link>
            ) : (
              <Link key={idea.id} href={`/feed/${idea.slug}`} style={{ textDecoration: "none", color: "inherit" }}>
                {card}
              </Link>
            );
          })}
        </div>
      )}
    </main>
  );
}
