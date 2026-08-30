import { createHmac } from "crypto";
import { describe, expect, it } from "vitest";
import { verifyRazorpayWebhookSignature } from "./webhook-signature";

describe("verifyRazorpayWebhookSignature", () => {
  const secret = "test_webhook_secret";
  const body = '{"event":"subscription.charged"}';
  const signature = createHmac("sha256", secret).update(body).digest("hex");

  it("accepts Razorpay's signature for the exact raw request body", () => {
    expect(verifyRazorpayWebhookSignature(body, signature, secret)).toBe(true);
  });

  it("rejects a tampered payload, signature, or secret", () => {
    expect(verifyRazorpayWebhookSignature(`${body} `, signature, secret)).toBe(false);
    expect(verifyRazorpayWebhookSignature(body, `${signature.slice(0, -1)}0`, secret)).toBe(false);
    expect(verifyRazorpayWebhookSignature(body, signature, "wrong_secret")).toBe(false);
  });
});
