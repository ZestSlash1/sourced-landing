import { NextResponse } from "next/server";
import { FOUNDING_SLOTS, foundingSlotsRemaining } from "@/lib/subscriptions/founding";

export const dynamic = "force-dynamic";

/** GET /api/founding-status — public, used by the pricing section to show the live founding-rate count. */
export async function GET() {
  const remaining = await foundingSlotsRemaining();
  return NextResponse.json({ remaining, total: FOUNDING_SLOTS });
}
