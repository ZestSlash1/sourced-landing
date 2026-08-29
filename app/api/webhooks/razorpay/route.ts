import { NextRequest, NextResponse } from "next/server";
import { verifyRazorpaySignature } from "@/lib/subscriptions/verify-razorpay-signature";
import { upsertSubscriber, getSubscriber } from "@/lib/subscriptions/store";
import type { Tier } from "@/lib/subscriptions/types";

const PLAN_TIER: Record<string, Tier> = {
  [process.env.RAZORPAY_BUILDER_PLAN_ID ?? "__builder__"]: "builder",
  [process.env.RAZORPAY_STUDIO_PLAN_ID ?? "__studio__"]: "studio",
};

interface RazorpaySubscriptionEntity {
  id: string;
  plan_id: string;
  notes?: { email?: string };
}

interface RazorpayWebhookPayload {
  event: string;
  payload: {
    subscription?: { entity: RazorpaySubscriptionEntity };
  };
}

export async function POST(request: NextRequest) {
  const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error("RAZORPAY_WEBHOOK_SECRET is not configured");
    return NextResponse.json({ error: "Webhook not configured" }, { status: 500 });
  }

  // Must read the raw body before any JSON parsing for the HMAC check to be valid.
  const rawBody = await request.text();
  const signature = request.headers.get("x-razorpay-signature");

  if (!verifyRazorpaySignature(rawBody, signature, webhookSecret)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const body = JSON.parse(rawBody) as RazorpayWebhookPayload;
  const subscription = body.payload.subscription?.entity;
  const email = subscription?.notes?.email;

  if (!subscription || !email) {
    // Nothing actionable — acknowledge so Razorpay doesn't retry.
    return NextResponse.json({ received: true });
  }

  const tier = PLAN_TIER[subscription.plan_id];

  switch (body.event) {
    case "subscription.activated":
    case "subscription.charged": {
      if (!tier) break;
      await upsertSubscriber({
        email,
        razorpaySubscriptionId: subscription.id,
        tier,
        status: "active",
        tierRenewsAt: new Date().toISOString(),
      });
      break;
    }
    case "subscription.halted": {
      const existing = getSubscriber(email);
      await upsertSubscriber({
        email,
        razorpaySubscriptionId: subscription.id,
        tier: existing?.tier ?? tier ?? "free",
        status: "past_due",
        pastDueSince: existing?.pastDueSince ?? new Date().toISOString(),
      });
      break;
    }
    case "subscription.cancelled": {
      const existing = getSubscriber(email);
      await upsertSubscriber({
        email,
        razorpaySubscriptionId: subscription.id,
        tier: existing?.tier ?? tier ?? "free",
        status: "cancelled",
      });
      break;
    }
    default:
      break;
  }

  return NextResponse.json({ received: true });
}
