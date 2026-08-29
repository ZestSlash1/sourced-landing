import { NextResponse } from "next/server";
import { getPublishedIdeaByIdOrSlug } from "@/lib/idea-drops/repository";
import { resolveUserTier } from "@/lib/idea-drops/resolve-user-tier";
import { scopeToTier } from "@/lib/idea-drops/scope-to-tier";

export const dynamic = "force-dynamic";

/**
 * GET /api/ideas/[id] — id or slug.
 *
 * Not found or not published -> 404 for everyone (no admin bypass exists
 * yet; flagged to the user in the PR notes rather than inventing one).
 * Published but under-tier -> 200 with the teaser, never 403 — the teaser
 * is the upsell and is meant to be visible.
 */
export async function GET(_request: Request, { params }: { params: { id: string } }) {
  const idea = await getPublishedIdeaByIdOrSlug(params.id);
  if (!idea) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const userTier = await resolveUserTier();
  return NextResponse.json(scopeToTier(idea, userTier));
}
