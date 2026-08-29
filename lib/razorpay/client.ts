import "server-only";
import Razorpay from "razorpay";

let client: Razorpay | null = null;

/** Server-only Razorpay SDK instance, for creating subscriptions/plans. */
export function getRazorpayClient(): Razorpay {
  if (client) return client;

  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keyId || !keySecret) {
    throw new Error("Missing RAZORPAY_KEY_ID or RAZORPAY_KEY_SECRET environment variables.");
  }

  client = new Razorpay({ key_id: keyId, key_secret: keySecret });
  return client;
}
