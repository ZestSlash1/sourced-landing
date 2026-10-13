import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/require-user";
import { verifySameOrigin } from "@/lib/security/csrf";
import { getPublishedIdeaByIdOrSlug } from "@/lib/idea-drops/repository";
import { removeOpportunityWatch, saveOpportunityWatch } from "@/lib/idea-drops/watchlist";
import { getSessionId } from "@/lib/track";

export async function PUT(request: Request) {
  if (!verifySameOrigin(request).ok) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const check = await requireUser();
  if (!check.ok || !check.subscriber.userId) return NextResponse.json({ error: "Sign in to save an opportunity." }, { status: 401 });
  let body;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid JSON." }, { status: 400 }); }
  if (!body || typeof body.slug !== "string" || !/^[a-z0-9][a-z0-9-]{0,199}$/.test(body.slug) || typeof body.following !== "boolean") {
    return NextResponse.json({ error: "A valid slug and following boolean are required." }, { status: 400 });
  }
  try {
    const idea = await getPublishedIdeaByIdOrSlug(body.slug);
    if (!idea) return NextResponse.json({ error: "Published opportunity not found." }, { status: 404 });
    if (body.following) await saveOpportunityWatch(check.subscriber.userId, idea.id, idea.evidence, getSessionId() ?? `account:${check.subscriber.userId}`);
    else await removeOpportunityWatch(check.subscriber.userId, idea.id);
    return NextResponse.json({ following: body.following }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    console.error("watchlist save failed", error);
    return NextResponse.json({ error: "Could not save your shortlist. Please try again." }, { status: 503 });
  }
}
