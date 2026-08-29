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
    <main style={{ maxWidth: 560, margin: "0 auto", padding: "40px 24px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <h1 className="display" style={{ fontSize: 24, margin: 0 }}>
          Account
        </h1>
        <SignOutButton />
      </div>

      <div
        style={{
          border: "1px solid var(--line)",
          borderRadius: "var(--r-sm)",
          padding: "20px 22px",
          marginBottom: 24,
        }}
      >
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 12, color: "var(--ink-soft)", marginBottom: 2 }}>Email</div>
          <div style={{ fontSize: 15 }}>{subscriber.email}</div>
        </div>

        <div style={{ display: "flex", gap: 32, marginBottom: 14 }}>
          <div>
            <div style={{ fontSize: 12, color: "var(--ink-soft)", marginBottom: 2 }}>Plan</div>
            <div style={{ fontSize: 15, fontWeight: 600 }}>{TIER_LABEL[subscriber.tier] ?? subscriber.tier}</div>
          </div>
          <div>
            <div style={{ fontSize: 12, color: "var(--ink-soft)", marginBottom: 2 }}>Status</div>
            <div
              style={{
                fontSize: 15,
                fontWeight: 600,
                color: subscriber.status === "active" ? "inherit" : "var(--coral, #e5533d)",
              }}
            >
              {STATUS_LABEL[subscriber.status] ?? subscriber.status}
            </div>
          </div>
        </div>

        {renewsAt && (
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 12, color: "var(--ink-soft)", marginBottom: 2 }}>Renews</div>
            <div style={{ fontSize: 14 }}>{renewsAt}</div>
          </div>
        )}

        {graceEndsAt && (
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 12, color: "var(--coral, #e5533d)", marginBottom: 2 }}>
              Payment issue — access ends
            </div>
            <div style={{ fontSize: 14 }}>{graceEndsAt}</div>
          </div>
        )}

        <div style={{ marginBottom: subscriber.tier === "free" ? 14 : 0 }}>
          <div style={{ fontSize: 12, color: "var(--ink-soft)", marginBottom: 2 }}>Full ideas this month</div>
          <div style={{ fontSize: 14 }}>
            {quota.quota === null
              ? "Unlimited"
              : `${quota.used} of ${quota.quota} used · resets ${quotaResetsOn}`}
          </div>
        </div>

        {subscriber.tier === "free" && (
          <div style={{ marginTop: 14 }}>
            <Link
              href="/#pricing"
              style={{
                display: "inline-block",
                padding: "9px 16px",
                background: "var(--violet)",
                color: "#fff",
                borderRadius: "var(--r-sm)",
                fontWeight: 600,
                fontSize: 13,
                textDecoration: "none",
              }}
            >
              Upgrade
            </Link>
          </div>
        )}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 24 }}>
        <Link
          href="/feed"
          style={{
            padding: "14px 16px",
            border: "1px solid var(--line)",
            borderRadius: "var(--r-sm)",
            textDecoration: "none",
            color: "inherit",
            fontSize: 14,
            fontWeight: 600,
          }}
        >
          Your feed →
        </Link>
        <Link
          href="/account/topics"
          style={{
            padding: "14px 16px",
            border: "1px solid var(--line)",
            borderRadius: "var(--r-sm)",
            textDecoration: "none",
            color: "inherit",
            fontSize: 14,
            fontWeight: 600,
          }}
        >
          Topic preferences →
        </Link>
      </div>

      <a
        href="/"
        style={{
          display: "inline-block",
          fontSize: 13,
          color: "var(--ink-soft)",
          textDecoration: "none",
        }}
      >
        ← Back to Sourced
      </a>
    </main>
  );
}
