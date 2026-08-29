import { NextRequest, NextResponse } from "next/server";

const PLAN_LINKS: Record<string, string | undefined> = {
  builder: process.env.BUILDER_PAYMENT_LINK,
  studio: process.env.STUDIO_PAYMENT_LINK,
};

/** Thin redirect so the raw Payment Link URLs aren't hardcoded in the client bundle (ticket-01-payments.md). */
export async function GET(_request: NextRequest, { params }: { params: { plan: string } }) {
  const link = PLAN_LINKS[params.plan];
  if (!link) {
    return NextResponse.json({ error: "Unknown plan" }, { status: 400 });
  }
  return NextResponse.redirect(link, 302);
}
