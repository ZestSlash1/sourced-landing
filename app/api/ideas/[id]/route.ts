import { NextResponse } from "next/server";
import { getPublishedIdeaByIdOrSlug } from "@/lib/idea-drops/repository";
import { resolveAndRecordAccess, resolveViewerContext } from "@/lib/idea-drops/resolve-access";

export const dynamic = "force-dynamic";

/**
 * GET /api/ideas/[id] — id or slug.
 *
 * Not found or not published -> 404 for everyone (no admin bypass exists
 * yet; flagged to the user in the PR notes rather than inventing one).
 * Published but under-tier or over the monthly quota -> 200 with the
 * teaser, never 403 — the teaser is the upsell and is meant to be visible.
 * A tier-eligible, in-quota request here records the unlock
 * (lib/idea-drops/resolve-access.ts) — this is the one route that spends
 * a subscriber's monthly full-idea quota.
 */
export async function GET(_request: Request, { params }: { params: { id: string } }) {
  const idea = await getPublishedIdeaByIdOrSlug(params.id);
  if (!idea) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const viewer = await resolveViewerContext();
  const access = await resolveAndRecordAccess(idea, viewer);
  return NextResponse.json(access.idea);
}
