import { NextResponse } from "next/server";
import { getPublishedIdeaByIdOrSlug } from "@/lib/idea-drops/repository";
import { generateProductionContract } from "@/lib/idea-drops/production-contract";

export const dynamic = "force-dynamic";

/**
 * GET /api/ideas/[id]/spec
 *
 * Returns raw markdown CLAUDE.md production contract spec for direct terminal/agent consumption:
 *   curl -s https://www.getsourced.dev/api/ideas/[slug]/spec > CLAUDE.md
 */
export async function GET(_request: Request, { params }: { params: { id: string } }) {
  const idea = await getPublishedIdeaByIdOrSlug(params.id);
  if (!idea) {
    return new NextResponse("Idea brief not found", { status: 404 });
  }

  const specContent = generateProductionContract(idea);

  return new NextResponse(specContent, {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Content-Disposition": `inline; filename="${idea.slug}-CLAUDE.md"`,
      "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}
