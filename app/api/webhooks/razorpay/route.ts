import { NextResponse } from "next/server";
import { tierForRazorpayPlanId } from "@/lib/razorpay/plans";
import { getSubscriberByRazorpaySubscriptionId, updateSubscriberTier } from "@/lib/subscriptions/store";
import { track } from "@/lib/track";
import { notify } from "@/lib/notify";
import { verifyRazorpayWebhookSignature } from "@/lib/razorpay/webhook-signature";

export const dynamic = "force-dynamic";

interface RazorpaySubscriptionEntity {
  id: string;
  plan_id: string;
}

interface RazorpayPaymentEntity {
  id: string;
  amount: number;
  currency?: string;
}

function formatAmount(payment?: RazorpayPaymentEntity): string {
  if (!payment) return "amount unknown";
  // Razorpay amounts are in the smallest currency unit (paise for INR).
  return `${payment.currency ?? "INR"} ${(payment.amount / 100).toFixed(2)}`;
}

interface RazorpayWebhookPayload {
  event: string;
  payload: {
    subscription?: { entity: RazorpaySubscriptionEntity };
    payment?: { entity: RazorpayPaymentEntity };
  };
}

/**
 * POST /api/webhooks/razorpay — the only place tier/status actually change
 * on payment. Verifies the signature against the raw body (not the parsed
 * JSON — Razorpay signs the exact bytes sent), then reacts to subscription
 * lifecycle events. Anything it doesn't recognize, or can't match to a
 * subscriber, is a silent 200 no-op rather than an error — Razorpay retries
 * on non-2xx, and there's nothing to retry into existing here.
 */
const processedPaymentIds = new Set<string>();

export async function POST(request: Request) {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "Webhook not configured" }, { status: 500 });
  }

  const rawBody = await request.text();
  const signature = request.headers.get("x-razorpay-signature");
  if (!signature || !verifyRazorpayWebhookSignature(rawBody, signature, secret)) {
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
        const paymentId = payment?.id;
        const isDuplicate = paymentId && processedPaymentIds.has(paymentId);
        if (paymentId) {
          processedPaymentIds.add(paymentId);
          if (processedPaymentIds.size > 1000) {
            const first = processedPaymentIds.values().next().value;
            if (first) processedPaymentIds.delete(first);
          }
        }

        if (!isDuplicate) {
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
          await notify({
            title: "Payment received",
            message: `${subscriber.email} — ${tier} — ${formatAmount(payment)}`,
            tags: ["moneybag"],
            priority: 4,
          });
        }
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
