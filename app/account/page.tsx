import Link from "next/link";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/require-user";
import { getQuotaStatus, nextQuotaResetIso, unlockedIdeaIds } from "@/lib/idea-drops/quota";
import { listPublishedIdeas } from "@/lib/idea-drops/repository";
import { getSubscriberTopics } from "@/lib/subscriptions/subscriber-topics";
import SignOutButton from "./sign-out-button";

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

  const [quota, unlockedIds, publishedIdeas, topics] = await Promise.all([
    getQuotaStatus(subscriber.id, subscriber.tier),
    unlockedIdeaIds(subscriber.id),
    listPublishedIdeas(),
    getSubscriberTopics(subscriber.id),
  ]);

  const unlockedBriefs = publishedIdeas.filter((idea) => unlockedIds.has(idea.id));
  const initials = (subscriber.email?.slice(0, 2) || "SC").toUpperCase();
  const usagePct = quota.quota === null ? 100 : Math.min(100, Math.round((quota.used / quota.quota) * 100));

  return (
    <main className="app-shell narrow" style={{ maxWidth: 680 }}>
      {/* Header */}
      <div className="app-header" style={{ marginBottom: 8 }}>
        <div>
          <h1 className="app-title display" style={{ marginBottom: 4 }}>Account</h1>
          <p className="app-sub" style={{ margin: 0 }}>Your plan, usage quota, and unlocked briefs.</p>
        </div>
        <SignOutButton />
      </div>

      <div className="account-grid" style={{ marginTop: 24 }}>
        {/* Profile Card */}
        <div className="account-profile-box">
          <div className="account-avatar-wrap">
            <div className="account-avatar">{initials}</div>
            <div className="account-identity">
              <h2 className="account-email">{subscriber.email}</h2>
              <div className="account-meta-pills">
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
          {subscriber.tier === "free" && (
            <Link href="/#pricing" className="btn btn-primary" style={{ padding: "8px 18px", fontSize: 13, textDecoration: "none" }}>
              Upgrade Plan
            </Link>
          )}
        </div>

        {graceEndsAt && (
          <div style={{
            background: "rgba(255,111,94,0.12)",
            border: "1px solid rgba(255,111,94,0.3)",
            borderRadius: "var(--r-md)",
            padding: "14px 18px",
            fontSize: 13.5,
            color: "var(--coral-deep)"
          }}>
            <strong>Payment notice:</strong> Your grace period ends on {graceEndsAt}. Please update your payment method to avoid disruption.
          </div>
        )}

        {/* Quota & Usage Meter Card */}
        <div className="account-meter-card">
          <div className="account-meter-head">
            <h3 className="account-meter-title">Monthly Build Brief Unlocks</h3>
            <span className="account-meter-val">
              {quota.quota === null ? "Unlimited Access" : `${quota.used} / ${quota.quota} used`}
            </span>
          </div>
          <div className="account-track">
            <div className="account-track-fill" style={{ width: `${usagePct}%` }} />
          </div>
          <div className="account-meter-foot">
            <span>
              {quota.quota === null
                ? "Studio tier unlocks unlimited deep-dive briefs every month."
                : `${quota.remaining} remaining this billing cycle`}
            </span>
            <span>Resets on {quotaResetsOn}</span>
          </div>
        </div>

        {/* Topic Preferences Widget */}
        <div className="account-section-card">
          <div className="account-section-head">
            <h3 className="account-section-title">Topic Preferences</h3>
            <Link href="/account/topics" className="account-edit-link">
              Edit topics →
            </Link>
          </div>
          {topics.length === 0 ? (
            <div style={{ fontSize: 13.5, color: "var(--ink-soft)" }}>
              No custom topics chosen. Your feed currently shows all curated ideas.{" "}
              <Link href="/account/topics" style={{ color: "var(--violet-deep)", fontWeight: 600 }}>
                Pick your interests
              </Link>
            </div>
          ) : (
            <div className="account-chips-row">
              {topics.map((t) => (
                <span key={t} className="account-chip-pill">
                  {t}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Unlocked Briefs Vault */}
        <div className="account-section-card">
          <div className="account-section-head">
            <div>
              <h3 className="account-section-title">Unlocked Briefs Vault</h3>
              <p style={{ margin: "2px 0 0", fontSize: 12.5, color: "var(--ink-soft)" }}>
                Deep-dive specs, schemas, and AI agent prompts you have unlocked.
              </p>
            </div>
            <Link href="/feed" className="account-edit-link">
              Browse feed →
            </Link>
          </div>

          {unlockedBriefs.length === 0 ? (
            <div style={{
              background: "var(--bg)",
              border: "1px dashed var(--line)",
              borderRadius: "var(--r-md)",
              padding: "24px 20px",
              textAlign: "center"
            }}>
              <p style={{ margin: "0 0 10px", fontSize: 13.5, color: "var(--ink-soft)" }}>
                You haven&apos;t unlocked any build briefs yet this month.
              </p>
              <Link href="/feed" className="btn btn-primary" style={{ padding: "8px 16px", fontSize: 13, textDecoration: "none" }}>
                Explore live feed
              </Link>
            </div>
          ) : (
            <div className="vault-list">
              {unlockedBriefs.map((idea) => (
                <Link key={idea.id} href={`/feed/${idea.slug}`} className="vault-item">
                  <div style={{ minWidth: 0 }}>
                    <div className="vault-item-title">{idea.title}</div>
                    <div className="vault-item-meta">
                      {idea.category} · Demand {idea.demandScore}/100 · {idea.evidence.length} verified signal{idea.evidence.length === 1 ? "" : "s"}
                    </div>
                  </div>
                  <span className="vault-arrow">Open brief →</span>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Quick Links */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Link href="/feed" className="link-card" style={{ padding: "14px 16px", fontSize: 13.5 }}>
            <div style={{ fontWeight: 600, marginBottom: 2 }}>Idea Feed →</div>
            <div style={{ fontSize: 12, color: "var(--ink-soft)", fontWeight: 400 }}>Verified complaint clusters</div>
          </Link>
          <Link href="/methodology" className="link-card" style={{ padding: "14px 16px", fontSize: 13.5 }}>
            <div style={{ fontWeight: 600, marginBottom: 2 }}>Methodology →</div>
            <div style={{ fontSize: 12, color: "var(--ink-soft)", fontWeight: 400 }}>12 poller sources & clustering</div>
          </Link>
        </div>
      </div>

      <Link href="/" className="back-link" style={{ marginTop: 12, display: "inline-block" }}>
        ← Back to Sourced
      </Link>
    </main>
  );
}
