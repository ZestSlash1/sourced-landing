import { NextResponse } from "next/server";
import { getPublishedIdeaByIdOrSlug } from "@/lib/idea-drops/repository";
import { generateCursorRules } from "@/lib/idea-drops/cursorrules-generator";
import { verifyExportAccess } from "@/lib/security/export-gate";
import { applyWatermark } from "@/lib/security/watermark";

export const dynamic = "force-dynamic";

/**
 * GET /api/ideas/[id]/cursorrules
 *
 * Returns raw .cursorrules file for direct terminal/editor consumption:
 *   curl -s https://www.getsourced.dev/api/ideas/[slug]/cursorrules > .cursorrules
 *
 * Protected endpoint: verifies authentication and tier entitlement, records unlock if eligible,
 * and embeds a forensic cryptographic watermark into the exported rules.
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

  const rawCursorrules = generateCursorRules(idea);
  const watermarkedRules = applyWatermark(rawCursorrules, gate.subscriberId, idea.slug, "javascript");

  return new NextResponse(watermarkedRules, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Content-Disposition": `inline; filename="${idea.slug}.cursorrules"`,
      "Cache-Control": "private, no-cache, no-store, must-revalidate",
    },
  });
}
