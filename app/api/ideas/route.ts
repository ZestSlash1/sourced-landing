import { NextRequest, NextResponse } from "next/server";
import { listPublished } from "@/lib/idea-drops/store";
import { scopeToTier } from "@/lib/idea-drops/scope-to-tier";
import { getUserTier } from "@/lib/subscriptions/get-user-tier";

/**
 * No auth/session system exists yet, so the request identifies its user by
 * `?email=` (matching ticket-01: "no login system" is explicitly out of
 * scope there too). Swap this for a real session lookup once auth exists —
 * scopeToTier and getUserTier are already the seam for that.
 */
export async function GET(request: NextRequest) {
  const email = request.nextUrl.searchParams.get("email");
  const tier = getUserTier(email);

  const ideas = listPublished().map((idea) => scopeToTier(idea, tier));
  return NextResponse.json({ ideas });
}
