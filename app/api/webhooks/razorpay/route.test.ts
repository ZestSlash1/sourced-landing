import { createHmac } from "crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";

const getSubscriberByRazorpaySubscriptionId = vi.fn();
const updateSubscriberTier = vi.fn();
const tierForRazorpayPlanId = vi.fn();
const track = vi.fn();
const notify = vi.fn();

vi.mock("@/lib/subscriptions/store", () => ({
  getSubscriberByRazorpaySubscriptionId: (...args: unknown[]) => getSubscriberByRazorpaySubscriptionId(...args),
  updateSubscriberTier: (...args: unknown[]) => updateSubscriberTier(...args),
}));

vi.mock("@/lib/razorpay/plans", () => ({
  tierForRazorpayPlanId: (...args: unknown[]) => tierForRazorpayPlanId(...args),
}));

vi.mock("@/lib/track", () => ({
  track: (...args: unknown[]) => track(...args),
}));

vi.mock("@/lib/notify", () => ({
  notify: (...args: unknown[]) => notify(...args),
}));

describe("POST /api/webhooks/razorpay", () => {
  const originalEnv = { ...process.env };
  const secret = "test_webhook_secret";

  beforeEach(() => {
    process.env = { ...originalEnv };
    process.env.RAZORPAY_WEBHOOK_SECRET = secret;
    vi.clearAllMocks();
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  function makeRequest(bodyString: string, signature?: string): Request {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (signature) {
      headers["x-razorpay-signature"] = signature;
    }
    return new Request("https://localhost/api/webhooks/razorpay", {
      method: "POST",
      headers,
      body: bodyString,
    });
  }

  function sign(body: string): string {
    return createHmac("sha256", secret).update(body).digest("hex");
  }

  it("returns 500 when RAZORPAY_WEBHOOK_SECRET is unset", async () => {
    delete process.env.RAZORPAY_WEBHOOK_SECRET;
    const body = JSON.stringify({ event: "subscription.charged" });
    const res = await POST(makeRequest(body, sign(body)));
    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.error).toBe("Webhook not configured");
  });

  it("returns 400 when signature header is missing or invalid", async () => {
    const body = JSON.stringify({ event: "subscription.charged" });
    const resMissing = await POST(makeRequest(body));
    expect(resMissing.status).toBe(400);

    const resInvalid = await POST(makeRequest(body, "invalid_signature"));
    expect(resInvalid.status).toBe(400);
    const json = await resInvalid.json();
    expect(json.error).toBe("Invalid signature");
  });

  it("returns 200 no-op when body has no subscription entity", async () => {
    const body = JSON.stringify({ event: "payment.captured", payload: {} });
    const res = await POST(makeRequest(body, sign(body)));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.note).toContain("No subscription entity");
  });

  it("returns 200 no-op when no matching subscriber is found", async () => {
    getSubscriberByRazorpaySubscriptionId.mockResolvedValue(null);
    const body = JSON.stringify({
      event: "subscription.charged",
      payload: {
        subscription: { entity: { id: "sub_123", plan_id: "plan_builder" } },
      },
    });

    const res = await POST(makeRequest(body, sign(body)));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.note).toContain("No matching subscriber");
  });

  it("activates subscription and updates tier on subscription.charged", async () => {
    getSubscriberByRazorpaySubscriptionId.mockResolvedValue({
      id: "sub_rec_1",
      userId: "usr_1",
      email: "user@example.com",
      tier: "free",
    });
    tierForRazorpayPlanId.mockReturnValue("builder");

    const body = JSON.stringify({
      event: "subscription.charged",
      payload: {
        subscription: { entity: { id: "sub_123", plan_id: "plan_builder" } },
        payment: { entity: { id: "pay_456", amount: 39900, currency: "INR" } },
      },
    });

    const res = await POST(makeRequest(body, sign(body)));
    expect(res.status).toBe(200);
    expect(updateSubscriberTier).toHaveBeenCalledWith("sub_rec_1", "builder", "active");
    expect(track).toHaveBeenCalledWith({
      eventType: "checkout_completed",
      sessionId: "webhook:sub_123",
      userId: "usr_1",
      metadata: {
        tier: "builder",
        amount: 39900,
        razorpay_payment_id: "pay_456",
      },
    });
    expect(notify).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Payment received",
        message: "user@example.com — builder — INR 399.00",
      }),
    );
  });

  it("marks subscription past_due on subscription.pending or halted", async () => {
    getSubscriberByRazorpaySubscriptionId.mockResolvedValue({
      id: "sub_rec_1",
      userId: "usr_1",
      email: "user@example.com",
      tier: "builder",
    });

    const body = JSON.stringify({
      event: "subscription.pending",
      payload: {
        subscription: { entity: { id: "sub_123", plan_id: "plan_builder" } },
      },
    });

    const res = await POST(makeRequest(body, sign(body)));
    expect(res.status).toBe(200);
    expect(updateSubscriberTier).toHaveBeenCalledWith("sub_rec_1", "builder", "past_due");
  });

  it("downgrades to free and marks cancelled on subscription.cancelled", async () => {
    getSubscriberByRazorpaySubscriptionId.mockResolvedValue({
      id: "sub_rec_1",
      userId: "usr_1",
      email: "user@example.com",
      tier: "builder",
    });

    const body = JSON.stringify({
      event: "subscription.cancelled",
      payload: {
        subscription: { entity: { id: "sub_123", plan_id: "plan_builder" } },
      },
    });

    const res = await POST(makeRequest(body, sign(body)));
    expect(res.status).toBe(200);
    expect(updateSubscriberTier).toHaveBeenCalledWith("sub_rec_1", "free", "cancelled");
  });
});
