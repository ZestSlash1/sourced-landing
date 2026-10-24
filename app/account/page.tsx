import Link from "next/link";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/require-user";
import { getQuotaStatus, nextQuotaResetIso, unlockedIdeaIds } from "@/lib/idea-drops/quota";
import { listPublishedIdeas } from "@/lib/idea-drops/repository";
import { getSubscriberTopics } from "@/lib/subscriptions/subscriber-topics";
import SignOutButton from "./sign-out-button";
import OpportunityWatchButton from "@/components/opportunity-watch-button";
import { evidenceFingerprint, listOpportunityWatches } from "@/lib/idea-drops/watchlist";

export const dynamic = "force-dynamic";

const TIER_LABEL: Record<string, string> = {
  free: "Free Plan",
  builder: "Builder Tier",
  studio: "Studio Tier",
};

const STATUS_LABEL: Record<string, string> = {
  active: "Active",
  past_due: "Past due",
  cancelled: "Cancelled",
};

function formatDate(iso?: string) {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
}

export default async function AccountPage() {
  const check = await requireUser();
  if (check.ok === false) {
    redirect("/login");
  }

  const { subscriber } = check;
  const renewsAt = formatDate(subscriber.tierRenewsAt);
  const graceEndsAt = formatDate(subscriber.gracePeriodEndsAt);
  const quotaResetsOn = formatDate(nextQuotaResetIso());

  const [quota, unlockedIds, publishedIdeas, topics, watches] = await Promise.all([
    getQuotaStatus(subscriber.id, subscriber.tier),
    unlockedIdeaIds(subscriber.id),
    listPublishedIdeas(),
    getSubscriberTopics(subscriber.id),
    subscriber.userId ? listOpportunityWatches(subscriber.userId) : Promise.resolve([]),
  ]);

  const unlockedBriefs = publishedIdeas.filter((idea) => unlockedIds.has(idea.id));
  const initials = (subscriber.email?.slice(0, 2) || "SC").toUpperCase();
  const usagePct = quota.quota === null ? 100 : Math.min(100, Math.round((quota.used / quota.quota) * 100));

  return (
    <main className="app-shell" style={{ maxWidth: 1080, margin: "0 auto", padding: "88px 24px 80px" }}>
      {/* Top Header */}
      <div
        className="app-header"
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          flexWrap: "wrap",
          gap: 16,
          marginBottom: 20,
        }}
      >
        <div>
          <div style={{ marginBottom: 6 }}>
            <Link href="/" className="back-link" style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13 }}>
              <span>←</span> Back to Sourced
            </Link>
          </div>
          <h1 className="app-title display" style={{ fontSize: "clamp(28px, 3.6vw, 36px)", margin: "0 0 6px" }}>
            Account Workspace
          </h1>
          <p className="app-sub" style={{ margin: 0, color: "var(--ink-soft)", fontSize: 14 }}>
            Manage your subscription tier, usage quota, topic preferences, and unlocked research vault.
          </p>
        </div>
        <SignOutButton />
      </div>

      {/* Top Profile & Plan Banner Card */}
      <div
        style={{
          background: "var(--surface)",
          border: "1px solid var(--line)",
          borderRadius: "var(--r-xl)",
          padding: "26px 30px",
          boxShadow: "var(--shadow)",
          marginBottom: 24,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 20,
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: 2,
            background: "linear-gradient(90deg, var(--violet) 0%, #38BDF8 100%)",
          }}
        />

        <div style={{ display: "flex", alignItems: "center", gap: 18, minWidth: 0 }}>
          {/* Avatar Monogram */}
          <div
            style={{
              width: 54,
              height: 54,
              borderRadius: "50%",
              background: "linear-gradient(135deg, var(--violet) 0%, #8B5CF6 50%, #38BDF8 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#fff",
              fontWeight: 700,
              fontSize: 18,
              fontFamily: "var(--font-jetbrains-mono), monospace",
              flexShrink: 0,
              boxShadow: "0 0 16px rgba(124, 58, 237, 0.35)",
            }}
          >
            {initials}
          </div>

          <div style={{ minWidth: 0 }}>
            <h2
              style={{
                margin: "0 0 6px",
                fontSize: 18,
                fontWeight: 600,
                color: "var(--ink)",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {subscriber.email}
            </h2>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <span className={`tier-badge tier-${subscriber.tier}`}>
                {TIER_LABEL[subscriber.tier] ?? subscriber.tier}
              </span>
              <span className={`status-pill ${subscriber.status}`}>
                {STATUS_LABEL[subscriber.status] ?? subscriber.status}
              </span>
              {renewsAt && (
                <span style={{ fontSize: 12, color: "var(--ink-soft)" }}>
                  Renews {renewsAt}
                </span>
              )}
            </div>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {subscriber.tier === "free" ? (
            <Link
              href="/#pricing"
              className="btn btn-primary"
              style={{ padding: "9px 20px", fontSize: 13, textDecoration: "none" }}
            >
              Upgrade Plan
            </Link>
          ) : (
            <Link
              href="/feed"
              className="btn btn-ghost"
              style={{ padding: "9px 20px", fontSize: 13, textDecoration: "none" }}
            >
              Browse Live Feed →
            </Link>
          )}
        </div>
      </div>

      {/* Payment Grace Notice (if active) */}
      {graceEndsAt && (
        <div
          style={{
            background: "rgba(255, 94, 126, 0.12)",
            border: "1px solid rgba(255, 94, 126, 0.35)",
            borderRadius: "var(--r-md)",
            padding: "14px 20px",
            fontSize: 13.5,
            color: "var(--coral-deep)",
            marginBottom: 24,
          }}
        >
          <strong>Payment notice:</strong> Your grace period ends on {graceEndsAt}. Please update your payment method to
          avoid service disruption.
        </div>
      )}

      {/* 2-Column Bento Row: Quota Meter & Topic Preferences */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
          gap: 20,
          marginBottom: 24,
        }}
      >
        {/* Bento Column 1: Monthly Build Brief Unlocks */}
        <div
          style={{
            background: "var(--surface)",
            border: "1px solid var(--line)",
            borderRadius: "var(--r-xl)",
            padding: "24px 26px",
            boxShadow: "var(--shadow)",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
          }}
        >
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
              <div>
                <div
                  style={{
                    fontFamily: "var(--font-jetbrains-mono), monospace",
                    fontSize: 10.5,
                    fontWeight: 700,
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                    color: "var(--violet-deep)",
                    marginBottom: 4,
                  }}
                >
                  Monthly Quota
                </div>
                <h3 style={{ margin: 0, fontSize: 17, fontWeight: 600 }}>Build Brief Unlocks</h3>
              </div>
              <span
                style={{
                  fontFamily: "var(--font-jetbrains-mono), monospace",
                  fontSize: 15,
                  fontWeight: 700,
                  color: "var(--ink)",
                }}
              >
                {quota.quota === null ? "Unlimited Access" : `${quota.used} / ${quota.quota} used`}
              </span>
            </div>

            {/* Visual Usage Progress Track */}
            <div
              style={{
                width: "100%",
                height: 8,
                background: "rgba(255, 255, 255, 0.08)",
                borderRadius: 999,
                overflow: "hidden",
                margin: "14px 0",
              }}
            >
              <div
                style={{
                  width: `${usagePct}%`,
                  height: "100%",
                  background: "linear-gradient(90deg, var(--violet) 0%, #38BDF8 100%)",
                  borderRadius: 999,
                  transition: "width 0.4s ease",
                }}
              />
            </div>
          </div>

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: 8,
              fontSize: 12,
              color: "var(--ink-soft)",
              paddingTop: 10,
              borderTop: "1px solid var(--line)",
            }}
          >
            <span>
              {quota.quota === null
                ? "Studio tier unlocks unlimited deep-dive briefs."
                : `${quota.remaining} unlock${quota.remaining === 1 ? "" : "s"} remaining this billing cycle`}
            </span>
            <span>Resets on {quotaResetsOn}</span>
          </div>
        </div>

        {/* Bento Column 2: Topic Preferences Widget */}
        <div
          style={{
            background: "var(--surface)",
            border: "1px solid var(--line)",
            borderRadius: "var(--r-xl)",
            padding: "24px 26px",
            boxShadow: "var(--shadow)",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
          }}
        >
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
              <div>
                <div
                  style={{
                    fontFamily: "var(--font-jetbrains-mono), monospace",
                    fontSize: 10.5,
                    fontWeight: 700,
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                    color: "var(--violet-deep)",
                    marginBottom: 4,
                  }}
                >
                  Personalization
                </div>
                <h3 style={{ margin: 0, fontSize: 17, fontWeight: 600 }}>Topic Preferences</h3>
              </div>
              <Link
                href="/account/topics"
                style={{
                  fontSize: 12.5,
                  color: "var(--violet-deep)",
                  textDecoration: "none",
                  fontWeight: 600,
                }}
              >
                Edit topics →
              </Link>
            </div>

            {topics.length === 0 ? (
              <p style={{ margin: "10px 0 0", fontSize: 13.5, color: "var(--ink-soft)", lineHeight: 1.55 }}>
                No custom topics chosen. Your feed currently shows all curated startup briefs across all categories.{" "}
                <Link href="/account/topics" style={{ color: "var(--violet-deep)", fontWeight: 600 }}>
                  Pick your interests
                </Link>
              </p>
            ) : (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 10 }}>
                {topics.map((t) => (
                  <span
                    key={t}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      padding: "5px 12px",
                      borderRadius: "var(--r-chip)",
                      background: "rgba(124, 58, 237, 0.14)",
                      color: "#DDD6FE",
                      border: "1px solid rgba(124, 58, 237, 0.3)",
                      fontSize: 12,
                      fontWeight: 500,
                    }}
                  >
                    {t}
                  </span>
                ))}
              </div>
            )}
          </div>

          <div
            style={{
              paddingTop: 10,
              borderTop: "1px solid var(--line)",
              fontSize: 12,
              color: "var(--ink-soft)",
            }}
          >
            {topics.length > 0
              ? `${topics.length} topic${topics.length === 1 ? "" : "s"} selected for feed filtering`
              : "Feed set to global view"}
          </div>
        </div>
      </div>

      {/* Dedicated Opportunity Shortlist Card (id="shortlist") */}
      <section
        id="shortlist"
        aria-labelledby="shortlist-heading"
        style={{
          background: "var(--surface)",
          border: "1px solid var(--line)",
          borderRadius: "var(--r-xl)",
          padding: "26px 30px",
          boxShadow: "var(--shadow)",
          marginBottom: 24,
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12, marginBottom: 12 }}>
          <div>
            <div
              style={{
                fontFamily: "var(--font-jetbrains-mono), monospace",
                fontSize: 10.5,
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                color: "var(--violet-deep)",
                marginBottom: 4,
              }}
            >
              Watchlist Engine
            </div>
            <h2 id="shortlist-heading" style={{ margin: "0 0 4px", fontSize: 20, fontWeight: 700 }}>
              Your Opportunity Shortlist
            </h2>
            <p className="research-note" style={{ margin: 0 }}>
              Compare evidence with your last review. Changes appear here when a published brief is revised; automatic
              monitoring and email alerts are not included.
            </p>
          </div>
        </div>

        {watches.length === 0 ? (
          <div
            style={{
              background: "var(--bg)",
              border: "1px dashed var(--line)",
              borderRadius: "var(--r-md)",
              padding: "28px 24px",
              textAlign: "center",
              marginTop: 16,
            }}
          >
            <p style={{ margin: "0 0 10px", fontSize: 14, color: "var(--ink-soft)" }}>
              No saved opportunities yet. Star opportunities from their brief page to monitor evidence updates here.
            </p>
            <Link href="/feed" className="btn btn-primary" style={{ fontSize: 13, padding: "7px 18px", textDecoration: "none" }}>
              Browse the feed →
            </Link>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 14, marginTop: 18 }}>
            {watches.map((watch) => {
              const idea = publishedIdeas.find((item) => item.id === watch.ideaId);
              if (!idea) {
                return (
                  <p key={watch.ideaId} style={{ fontSize: 13, color: "var(--ink-soft)" }}>
                    A saved opportunity is no longer published.
                  </p>
                );
              }
              const changed = evidenceFingerprint(idea.evidence) !== watch.evidenceFingerprint;

              return (
                <div
                  key={watch.ideaId}
                  style={{
                    background: "var(--bg)",
                    border: "1px solid var(--line)",
                    borderRadius: "var(--r-md)",
                    padding: "18px 20px",
                    display: "flex",
                    flexDirection: "column",
                    gap: 12,
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                        <span
                          style={{
                            fontFamily: "var(--font-jetbrains-mono), monospace",
                            fontSize: 10.5,
                            fontWeight: 700,
                            padding: "2px 8px",
                            borderRadius: "var(--r-chip)",
                            background: "rgba(124, 58, 237, 0.15)",
                            color: "var(--violet-deep)",
                            textTransform: "uppercase",
                          }}
                        >
                          {idea.category}
                        </span>
                        <span style={{ fontSize: 11.5, color: "var(--ink-soft)", fontFamily: "var(--font-jetbrains-mono), monospace" }}>
                          Demand {idea.demandScore}%
                        </span>
                      </div>
                      <h3 style={{ margin: "0 0 6px", fontSize: 16.5, fontWeight: 600 }}>
                        <Link href={`/feed/${idea.slug}`} style={{ textDecoration: "none", color: "var(--ink)" }}>
                          {idea.title}
                        </Link>
                      </h3>
                    </div>

                    {/* High-Contrast Evidence Status Badges */}
                    {changed ? (
                      <span
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 6,
                          padding: "5px 12px",
                          borderRadius: 999,
                          background: "rgba(245, 158, 11, 0.16)",
                          color: "#FBBF24",
                          border: "1px solid rgba(245, 158, 11, 0.4)",
                          fontSize: 12,
                          fontWeight: 600,
                          whiteSpace: "nowrap",
                        }}
                      >
                        ⚠️ Evidence changed since your last review
                      </span>
                    ) : (
                      <span
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 6,
                          padding: "5px 12px",
                          borderRadius: 999,
                          background: "rgba(16, 185, 129, 0.12)",
                          color: "#34D399",
                          border: "1px solid rgba(16, 185, 129, 0.28)",
                          fontSize: 12,
                          fontWeight: 600,
                          whiteSpace: "nowrap",
                        }}
                      >
                        ✓ No evidence changes since your last review
                      </span>
                    )}
                  </div>

                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      flexWrap: "wrap",
                      gap: 12,
                      paddingTop: 10,
                      borderTop: "1px solid rgba(255, 255, 255, 0.05)",
                    }}
                  >
                    <div className="research-note" style={{ margin: 0 }}>
                      Last reviewed {formatDate(watch.reviewedAt)} · {idea.evidence.length} current evidence entries
                      {idea.updatedAt ? ` · Brief updated ${formatDate(idea.updatedAt)}` : ""}
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <OpportunityWatchButton slug={idea.slug} signedIn initialFollowing evidenceChanged={changed} />
                      <Link
                        href={`/feed/${idea.slug}`}
                        className="btn btn-ghost"
                        style={{ fontSize: 12, padding: "6px 14px", textDecoration: "none" }}
                      >
                        Open Dossier →
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Unlocked Briefs Vault */}
      <section
        style={{
          background: "var(--surface)",
          border: "1px solid var(--line)",
          borderRadius: "var(--r-xl)",
          padding: "26px 30px",
          boxShadow: "var(--shadow)",
          marginBottom: 24,
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12, marginBottom: 18 }}>
          <div>
            <div
              style={{
                fontFamily: "var(--font-jetbrains-mono), monospace",
                fontSize: 10.5,
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                color: "var(--violet-deep)",
                marginBottom: 4,
              }}
            >
              Unlocked Intelligence
            </div>
            <h2 style={{ margin: "0 0 4px", fontSize: 20, fontWeight: 700 }}>
              Unlocked Briefs Vault ({unlockedBriefs.length})
            </h2>
            <p style={{ margin: 0, fontSize: 13, color: "var(--ink-soft)" }}>
              Deep-dive specs, core loops, turnkey AI agent prompts, and DDL database schemas unlocked with your account.
            </p>
          </div>
          <Link
            href="/feed"
            style={{
              fontSize: 12.5,
              color: "var(--violet-deep)",
              textDecoration: "none",
              fontWeight: 600,
            }}
          >
            Browse feed →
          </Link>
        </div>

        {unlockedBriefs.length === 0 ? (
          <div
            style={{
              background: "var(--bg)",
              border: "1px dashed var(--line)",
              borderRadius: "var(--r-md)",
              padding: "32px 24px",
              textAlign: "center",
            }}
          >
            <p style={{ margin: "0 0 12px", fontSize: 14, color: "var(--ink-soft)" }}>
              You haven&apos;t unlocked any build briefs yet this month.
            </p>
            <Link
              href="/feed"
              className="btn btn-primary"
              style={{ padding: "8px 18px", fontSize: 13, textDecoration: "none" }}
            >
              Explore live feed
            </Link>
          </div>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
              gap: 16,
            }}
          >
            {unlockedBriefs.map((idea) => (
              <Link
                key={idea.id}
                href={`/feed/${idea.slug}`}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  background: "var(--bg)",
                  border: "1px solid var(--line)",
                  borderRadius: "var(--r-md)",
                  padding: "18px 20px",
                  textDecoration: "none",
                  color: "inherit",
                  transition: "transform 0.18s ease, border-color 0.18s ease, box-shadow 0.18s ease",
                }}
              >
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                    <span
                      style={{
                        fontFamily: "var(--font-jetbrains-mono), monospace",
                        fontSize: 10.5,
                        fontWeight: 700,
                        padding: "3px 8px",
                        borderRadius: "var(--r-chip)",
                        background: "rgba(124, 58, 237, 0.15)",
                        color: "var(--violet-deep)",
                        textTransform: "uppercase",
                      }}
                    >
                      {idea.category}
                    </span>
                    <span
                      style={{
                        fontSize: 11.5,
                        fontFamily: "var(--font-jetbrains-mono), monospace",
                        color: "#34D399",
                        fontWeight: 700,
                      }}
                    >
                      {idea.demandScore}% demand
                    </span>
                  </div>
                  <h4 style={{ margin: "0 0 6px", fontSize: 15, fontWeight: 600, lineHeight: 1.35, color: "var(--ink)" }}>
                    {idea.title}
                  </h4>
                  <p style={{ margin: "0 0 12px", fontSize: 12.5, color: "var(--ink-soft)", lineHeight: 1.5 }}>
                    {idea.problem.summary.length > 95
                      ? `${idea.problem.summary.slice(0, 95)}…`
                      : idea.problem.summary}
                  </p>
                </div>

                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    paddingTop: 10,
                    borderTop: "1px solid rgba(255, 255, 255, 0.05)",
                    fontSize: 11.5,
                    color: "var(--ink-soft)",
                  }}
                >
                  <span>{idea.evidence.length} signals</span>
                  <span style={{ color: "var(--violet-deep)", fontWeight: 600 }}>Open brief →</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Quick Navigation Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 14 }}>
        <Link
          href="/feed"
          className="link-card"
          style={{ padding: "16px 20px", background: "var(--surface)", border: "1px solid var(--line)" }}
        >
          <div style={{ fontWeight: 600, marginBottom: 2, color: "var(--ink)" }}>Startup Idea Feed →</div>
          <div style={{ fontSize: 12, color: "var(--ink-soft)", fontWeight: 400 }}>Verified complaint clusters</div>
        </Link>
        <Link
          href="/methodology"
          className="link-card"
          style={{ padding: "16px 20px", background: "var(--surface)", border: "1px solid var(--line)" }}
        >
          <div style={{ fontWeight: 600, marginBottom: 2, color: "var(--ink)" }}>Methodology & Pipeline →</div>
          <div style={{ fontSize: 12, color: "var(--ink-soft)", fontWeight: 400 }}>12 poller sources & clustering</div>
        </Link>
        <Link
          href="/#sample"
          className="link-card"
          style={{ padding: "16px 20px", background: "var(--surface)", border: "1px solid var(--line)" }}
        >
          <div style={{ fontWeight: 600, marginBottom: 2, color: "var(--ink)" }}>Free Sample Walkthrough →</div>
          <div style={{ fontSize: 12, color: "var(--ink-soft)", fontWeight: 400 }}>Inspect complete research brief</div>
        </Link>
      </div>
    </main>
  );
}
