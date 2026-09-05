import { NextResponse } from "next/server";
import { recordSignup } from "@/lib/slatebase/server";
import { checkRateLimit } from "@/lib/security/rate-limit";
import { getCurrentUser } from "@/lib/auth/current-user";
import { track } from "@/lib/track";

export const dynamic = "force-dynamic";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ALLOWED_TIERS = new Set(["free", "builder", "studio"]);

export async function POST(request: Request) {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "anonymous";

  // Rate Limiting (10 requests per minute per IP to prevent spam abuse)
  const rateResult = checkRateLimit(`signup_${ip}`, 10, 60_000);
  if (!rateResult.success) {
    return NextResponse.json(
      { error: "Too many attempts. Please wait a minute before trying again." },
      { status: 429 }
    );
  }

  const body = (await request.json().catch(() => null)) as {
    email?: unknown;
    tier?: unknown;
    source?: unknown;
    hp?: unknown;
    honeypot?: unknown;
  } | null;

  // Honeypot bot protection: if hidden bot fields are populated, return 200 without writing
  if (body?.hp || body?.honeypot) {
    console.warn(`[Bot Detected] Honeypot field triggered from IP ${ip}`);
    return NextResponse.json({ ok: true });
  }

  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  const rawTier = typeof body?.tier === "string" ? body.tier.toLowerCase() : "free";
  const tier = ALLOWED_TIERS.has(rawTier) ? rawTier : "free";
  const source = typeof body?.source === "string" ? body.source.slice(0, 100) : "hero";

  if (!email || !EMAIL_PATTERN.test(email)) {
    return NextResponse.json({ error: "Please provide a valid email address." }, { status: 400 });
  }

  const result = await recordSignup({
    email,
    tier,
    source,
    created_at: new Date().toISOString(),
  });

  if (!result.success) {
    return NextResponse.json(
      { error: result.error || "Failed to record signup. Please try again." },
      { status: 500 }
    );
  }

  try {
    const user = await getCurrentUser().catch(() => null);
    await track({
      eventType: "signup_captured",
      userId: user?.id ?? null,
      path: `/pricing#${tier}`,
      metadata: { tier, source, backend: "slatebase" },
    });
  } catch {
    // Tracking is non-blocking
  }

  return NextResponse.json({
    ok: true,
    existing: Boolean(result.existing),
    message: result.existing
      ? "You are already signed up! We have refreshed your access."
      : "Signup successful! Free tier access granted.",
  });
}
