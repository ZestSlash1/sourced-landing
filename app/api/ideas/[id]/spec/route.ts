import { NextResponse } from "next/server";
import { getPublishedIdeaByIdOrSlug } from "@/lib/idea-drops/repository";
import { generateProductionContract } from "@/lib/idea-drops/production-contract";
import { verifyExportAccess } from "@/lib/security/export-gate";
import { applyWatermark } from "@/lib/security/watermark";

export const dynamic = "force-dynamic";

/**
 * GET /api/ideas/[id]/spec
 *
 * Returns raw markdown CLAUDE.md production contract spec for direct terminal/agent consumption:
 *   curl -s https://www.getsourced.dev/api/ideas/[slug]/spec > CLAUDE.md
 *
 * Protected endpoint: verifies authentication and tier entitlement, records unlock if eligible,
 * and embeds a forensic cryptographic watermark into the exported specification.
 */
export async function GET(_request: Request, { params }: { params: { id: string } }) {
  const idea = await getPublishedIdeaByIdOrSlug(params.id);
  if (!idea) {
    return new NextResponse("Idea brief not found", { status: 404 });
  }

  const gate = await verifyExportAccess(idea);
  if (!gate.allowed) {
    return gate.response;
  }

  const rawSpec = generateProductionContract(idea);
  const watermarkedSpec = applyWatermark(rawSpec, gate.subscriberId, idea.slug, "markdown");

  return new NextResponse(watermarkedSpec, {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Content-Disposition": `inline; filename="${idea.slug}-CLAUDE.md"`,
      "Cache-Control": "private, no-cache, no-store, must-revalidate",
    },
  });
}
