import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/require-user";
import { getRazorpayClient } from "@/lib/razorpay/client";
import { isPlanKey, razorpayPlanId, tierForPlan } from "@/lib/razorpay/plans";
import { setSubscriberRazorpaySubscription } from "@/lib/subscriptions/store";
import { foundingSlotsRemaining } from "@/lib/subscriptions/founding";
import { track } from "@/lib/track";

export const dynamic = "force-dynamic";

// Billing cycles to authorize upfront ("until cancelled" isn't a literal
// option in Razorpay's API — a long total_count is the standard way to get
// that behavior). ~10 years either way.
const TOTAL_COUNT: Record<"monthly" | "yearly", number> = { monthly: 120, yearly: 10 };

/**
 * POST /api/razorpay/create-subscription — starts checkout for a paid plan.
 * Creates the Razorpay subscription and links it to the subscriber
 * immediately, but tier/status are untouched until the webhook confirms an
 * actual charge — this route alone can never grant paid access.
 */
export async function POST(request: Request) {
  const check = await requireUser();
  if (check.ok === false) {
    return NextResponse.json({ error: "Unauthorized" }, { status: check.status });
  }

  const body = (await request.json()) as { plan?: string };
  if (!body.plan || !isPlanKey(body.plan)) {
    return NextResponse.json({ error: "Invalid or missing plan" }, { status: 400 });
  }

  if (body.plan === "builder-founding" && (await foundingSlotsRemaining()) <= 0) {
    return NextResponse.json({ error: "Founding-rate spots are gone — get Builder at the regular price." }, { status: 409 });
  }

  const cycle = body.plan.endsWith("yearly") ? "yearly" : "monthly";
  const razorpay = getRazorpayClient();

  const subscription = await razorpay.subscriptions.create({
    plan_id: razorpayPlanId(body.plan),
    customer_notify: 1,
    total_count: TOTAL_COUNT[cycle],
    notes: { subscriberId: check.subscriber.id },
  });

  await setSubscriberRazorpaySubscription(check.subscriber.id, subscription.id);

  await track({
    eventType: "checkout_started",
    userId: check.subscriber.userId ?? null,
    metadata: { tier: tierForPlan(body.plan) },
  });

  return NextResponse.json({
    subscriptionId: subscription.id,
    keyId: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
    email: check.subscriber.email,
  });
}
