import { NextRequest, NextResponse } from "next/server";
import { getByIdOrSlug } from "@/lib/idea-drops/store";
import { scopeToTier } from "@/lib/idea-drops/scope-to-tier";
import { getUserTier } from "@/lib/subscriptions/get-user-tier";
import { isAuthorizedAdmin } from "@/lib/idea-drops/require-admin";

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const idea = getByIdOrSlug(params.id);

  if (!idea || (idea.status !== "published" && !isAuthorizedAdmin(request))) {
    // Drafts/needs_evidence 404 for everyone except an admin — there is no
    // admin role system yet, so this checks the same bearer-token stopgap
    // as the /api/admin routes (see lib/idea-drops/require-admin.ts).
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const email = request.nextUrl.searchParams.get("email");
  const tier = getUserTier(email);

  // Under-tier is a 200 with the teaser shape, never a 403 — the teaser is
  // the upsell and is meant to be visible.
  return NextResponse.json(scopeToTier(idea, tier));
}
