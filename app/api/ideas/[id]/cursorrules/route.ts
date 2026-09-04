import { NextResponse } from "next/server";
import { getPublishedIdeaByIdOrSlug } from "@/lib/idea-drops/repository";
import { generateCursorRules } from "@/lib/idea-drops/cursorrules-generator";

export const dynamic = "force-dynamic";

/**
 * GET /api/ideas/[id]/cursorrules
 *
 * Returns raw .cursorrules file for direct terminal/editor consumption:
 *   curl -s https://www.getsourced.dev/api/ideas/[slug]/cursorrules > .cursorrules
 */
export async function GET(_request: Request, { params }: { params: { id: string } }) {
  const idea = await getPublishedIdeaByIdOrSlug(params.id);
  if (!idea) {
    return new NextResponse("Idea brief not found", { status: 404 });
  }

  const cursorrulesContent = generateCursorRules(idea);

  return new NextResponse(cursorrulesContent, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Content-Disposition": `inline; filename="${idea.slug}.cursorrules"`,
      "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}
