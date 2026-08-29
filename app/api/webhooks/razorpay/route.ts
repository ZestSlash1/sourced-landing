import { createHmac, timingSafeEqual } from "crypto";
import { NextResponse } from "next/server";
import { tierForRazorpayPlanId } from "@/lib/razorpay/plans";
import { getSubscriberByRazorpaySubscriptionId, updateSubscriberTier } from "@/lib/subscriptions/store";
import { track } from "@/lib/track";

export const dynamic = "force-dynamic";

interface RazorpaySubscriptionEntity {
  id: string;
  plan_id: string;
}

interface RazorpayPaymentEntity {
  id: string;
  amount: number;
}

interface RazorpayWebhookPayload {
  event: string;
  payload: {
    subscription?: { entity: RazorpaySubscriptionEntity };
    payment?: { entity: RazorpayPaymentEntity };
  };
}

function verifySignature(rawBody: string, signature: string, secret: string): boolean {
  const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
  const expectedBuf = Buffer.from(expected);
  const actualBuf = Buffer.from(signature);
  return expectedBuf.length === actualBuf.length && timingSafeEqual(expectedBuf, actualBuf);
}

/**
 * POST /api/webhooks/razorpay — the only place tier/status actually change
 * on payment. Verifies the signature against the raw body (not the parsed
 * JSON — Razorpay signs the exact bytes sent), then reacts to subscription
 * lifecycle events. Anything it doesn't recognize, or can't match to a
 * subscriber, is a silent 200 no-op rather than an error — Razorpay retries
 * on non-2xx, and there's nothing to retry into existing here.
 */
export async function POST(request: Request) {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "Webhook not configured" }, { status: 500 });
  }

  const rawBody = await request.text();
  const signature = request.headers.get("x-razorpay-signature");
  if (!signature || !verifySignature(rawBody, signature, secret)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const body = JSON.parse(rawBody) as RazorpayWebhookPayload;
  const subscriptionEntity = body.payload.subscription?.entity;
  if (!subscriptionEntity) {
    return NextResponse.json({ ok: true, note: "No subscription entity, ignored" });
  }

  const subscriber = await getSubscriberByRazorpaySubscriptionId(subscriptionEntity.id);
  if (!subscriber) {
    return NextResponse.json({ ok: true, note: "No matching subscriber, ignored" });
  }

  switch (body.event) {
    case "subscription.activated":
    case "subscription.charged": {
      const tier = tierForRazorpayPlanId(subscriptionEntity.plan_id);
      if (tier) {
        await updateSubscriberTier(subscriber.id, tier, "active");
        const payment = body.payload.payment?.entity;
        await track({
          eventType: "checkout_completed",
          sessionId: `webhook:${subscriptionEntity.id}`,
          userId: subscriber.userId ?? null,
          metadata: {
            tier,
            amount: payment?.amount ?? null,
            razorpay_payment_id: payment?.id ?? null,
          },
        });
      }
      break;
    }
    case "subscription.pending":
    case "subscription.halted":
      // Payment failed/is retrying — flag it, but don't cut access yet.
      await updateSubscriberTier(subscriber.id, subscriber.tier, "past_due");
      break;
    case "subscription.cancelled":
    case "subscription.completed":
      await updateSubscriberTier(subscriber.id, "free", "cancelled");
      break;
    default:
      break;
  }

  return NextResponse.json({ ok: true });
}
