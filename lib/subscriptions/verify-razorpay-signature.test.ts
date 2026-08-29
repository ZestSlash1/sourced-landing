import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { verifyRazorpaySignature } from "./verify-razorpay-signature";

describe("verifyRazorpaySignature", () => {
  const secret = "whsec_test";
  const body = JSON.stringify({ event: "subscription.activated" });

  it("accepts a correctly signed payload", () => {
    const signature = createHmac("sha256", secret).update(body).digest("hex");
    expect(verifyRazorpaySignature(body, signature, secret)).toBe(true);
  });

  it("rejects a wrong secret", () => {
    const signature = createHmac("sha256", "wrong-secret").update(body).digest("hex");
    expect(verifyRazorpaySignature(body, signature, secret)).toBe(false);
  });

  it("rejects a tampered body", () => {
    const signature = createHmac("sha256", secret).update(body).digest("hex");
    const tampered = JSON.stringify({ event: "subscription.cancelled" });
    expect(verifyRazorpaySignature(tampered, signature, secret)).toBe(false);
  });

  it("rejects a missing signature header", () => {
    expect(verifyRazorpaySignature(body, null, secret)).toBe(false);
  });
});
