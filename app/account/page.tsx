import Link from "next/link";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/require-user";
import { getQuotaStatus, nextQuotaResetIso } from "@/lib/idea-drops/quota";
import SignOutButton from "./sign-out-button";

export const dynamic = "force-dynamic";

const TIER_LABEL: Record<string, string> = {
  free: "Free",
  builder: "Builder",
  studio: "Studio",
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
  const quota = await getQuotaStatus(subscriber.id, subscriber.tier);
  const quotaResetsOn = formatDate(nextQuotaResetIso());

  return (
    <main className="app-shell narrow">
      <div className="app-header">
        <h1 className="app-title display">Account</h1>
        <SignOutButton />
      </div>
      <p className="app-sub">Your plan, usage, and preferences.</p>

      <div className="account-card">
        <div className="account-row">
          <div>
            <div className="account-field-label">Email</div>
            <div className="account-field-value" style={{ fontWeight: 400 }}>
              {subscriber.email}
            </div>
          </div>
        </div>

        <div className="account-row">
          <div>
            <div className="account-field-label">Plan</div>
            <div className="account-field-value">{TIER_LABEL[subscriber.tier] ?? subscriber.tier}</div>
          </div>
          <div>
            <div className="account-field-label">Status</div>
            <span className={`status-pill ${subscriber.status}`}>{STATUS_LABEL[subscriber.status] ?? subscriber.status}</span>
          </div>
        </div>

        {renewsAt && (
          <div className="account-row">
            <div>
              <div className="account-field-label">Renews</div>
              <div className="account-field-value" style={{ fontWeight: 400, fontSize: 14 }}>
                {renewsAt}
              </div>
            </div>
          </div>
        )}

        {graceEndsAt && (
          <div className="account-row">
            <div>
              <div className="account-field-label" style={{ color: "var(--coral)" }}>
                Payment issue — access ends
              </div>
              <div className="account-field-value" style={{ fontWeight: 400, fontSize: 14 }}>
                {graceEndsAt}
              </div>
            </div>
          </div>
        )}

        <div className="account-row">
          <div>
            <div className="account-field-label">Full ideas this month</div>
            <div className="account-field-value" style={{ fontWeight: 400, fontSize: 14 }}>
              {quota.quota === null ? "Unlimited" : `${quota.used} of ${quota.quota} used · resets ${quotaResetsOn}`}
            </div>
          </div>
        </div>

        {subscriber.tier === "free" && (
          <div style={{ marginTop: 4 }}>
            <Link href="/#pricing" className="btn btn-primary" style={{ padding: "9px 18px", fontSize: 13 }}>
              Upgrade
            </Link>
          </div>
        )}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 24 }}>
        <Link href="/feed" className="link-card">
          Your feed →
        </Link>
        <Link href="/account/topics" className="link-card">
          Topic preferences →
        </Link>
      </div>

      <Link href="/" className="back-link">
        ← Back to Sourced
      </Link>
    </main>
  );
}
