import { NextResponse } from "next/server";
import { getPublishedIdeaByIdOrSlug } from "@/lib/idea-drops/repository";
import { previewAccess, resolveViewerContext } from "@/lib/idea-drops/resolve-access";
import { unlockedIdeaIds } from "@/lib/idea-drops/quota";

export const dynamic = "force-dynamic";

/** Hosting is unavailable. An availability check must never spend a brief unlock. */
export async function GET(_request: Request, { params }: { params: { id: string } }) {
  const idea = await getPublishedIdeaByIdOrSlug(params.id);
  if (!idea) return NextResponse.json({ error: "Idea brief not found" }, { status: 404 });
  const viewer = await resolveViewerContext();
  if (!viewer.subscriberId) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  const access = await previewAccess(idea, viewer, await unlockedIdeaIds(viewer.subscriberId));
  if (access.kind !== "full") return NextResponse.json({ error: "Brief access required" }, { status: 403 });
  return NextResponse.json({ ok: false, error: "Database hosting is not available. Download schema.sql and use your own database provider." },
    { status: 503, headers: { "Cache-Control": "private, no-store" } });
}
