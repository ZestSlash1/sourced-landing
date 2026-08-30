import { createHmac, timingSafeEqual } from "crypto";

/** Verifies the exact raw bytes Razorpay signed, before a webhook is trusted. */
export function verifyRazorpayWebhookSignature(rawBody: string, signature: string, secret: string): boolean {
  const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
  const expectedBuffer = Buffer.from(expected);
  const signatureBuffer = Buffer.from(signature);
  return expectedBuffer.length === signatureBuffer.length && timingSafeEqual(expectedBuffer, signatureBuffer);
}
