import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Verifies the `X-Razorpay-Signature` header per Razorpay's documented HMAC
 * SHA256 scheme, computed over the raw (unparsed) request body.
 */
export function verifyRazorpaySignature(
  rawBody: string,
  signatureHeader: string | null,
  webhookSecret: string
): boolean {
  if (!signatureHeader) return false;

  const expected = createHmac("sha256", webhookSecret).update(rawBody).digest("hex");
  const expectedBuf = Buffer.from(expected, "hex");
  const actualBuf = Buffer.from(signatureHeader, "hex");

  if (expectedBuf.length !== actualBuf.length) return false;
  return timingSafeEqual(expectedBuf, actualBuf);
}
