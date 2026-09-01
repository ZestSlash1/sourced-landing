import type { UserTier } from "@/lib/idea-drops/scope-to-tier";

export const PLAN_KEYS = ["builder-monthly", "builder-yearly", "studio-monthly", "builder-founding"] as const;
export type PlanKey = (typeof PLAN_KEYS)[number];

export function isPlanKey(value: string): value is PlanKey {
  return (PLAN_KEYS as readonly string[]).includes(value);
}

interface PlanConfig {
  tier: Exclude<UserTier, "free">;
  envVar: string;
}

const PLAN_CONFIG: Record<PlanKey, PlanConfig> = {
  "builder-monthly": { tier: "builder", envVar: "RAZORPAY_PLAN_BUILDER_MONTHLY" },
  "builder-yearly": { tier: "builder", envVar: "RAZORPAY_PLAN_BUILDER_YEARLY" },
  "studio-monthly": { tier: "studio", envVar: "RAZORPAY_PLAN_STUDIO_MONTHLY" },
  // Same tier as builder-monthly — a separate Razorpay plan_id purely so the
  // ₹310/mo price is locked into the subscription itself. Gated to the
  // first 100 ever-paid subscribers; see lib/subscriptions/founding.ts.
  "builder-founding": { tier: "builder", envVar: "RAZORPAY_PLAN_BUILDER_FOUNDING" },
};

/** The tier a given plan key upgrades a subscriber to. */
export function tierForPlan(plan: PlanKey): Exclude<UserTier, "free"> {
  return PLAN_CONFIG[plan].tier;
}

/** Resolves a plan key to its live Razorpay plan_id, from env. */
export function razorpayPlanId(plan: PlanKey): string {
  const envVar = PLAN_CONFIG[plan].envVar;
  const id = process.env[envVar];
  if (!id) throw new Error(`Missing ${envVar} environment variable.`);
  return id;
}

/** Reverse lookup: a Razorpay plan_id back to which tier it grants, for webhook handling. */
export function tierForRazorpayPlanId(planId: string): Exclude<UserTier, "free"> | null {
  for (const key of PLAN_KEYS) {
    if (razorpayPlanIdSafe(key) === planId) return tierForPlan(key);
  }
  return null;
}

function razorpayPlanIdSafe(plan: PlanKey): string | undefined {
  return process.env[PLAN_CONFIG[plan].envVar];
}
