import { NextResponse } from "next/server";
import { getPublishedIdeaByIdOrSlug } from "@/lib/idea-drops/repository";
import { generatePrismaSchema, generateSqlSchema } from "@/lib/idea-drops/sql-schema-generator";
import { verifyExportAccess } from "@/lib/security/export-gate";
import { applyWatermark } from "@/lib/security/watermark";

export const dynamic = "force-dynamic";

/**
 * GET /api/ideas/[id]/schema
 *
 * Query parameters:
 *   - format=prisma: returns schema.prisma
 *   - format=sql (default): returns PostgreSQL schema.sql
 *
 * Protected endpoint: verifies authentication and tier entitlement, records unlock if eligible,
 * and embeds a forensic cryptographic watermark into the exported DDL.
 */
export async function GET(request: Request, { params }: { params: { id: string } }) {
  const idea = await getPublishedIdeaByIdOrSlug(params.id);
  if (!idea) {
    return new NextResponse("Idea brief not found", { status: 404 });
  }

  const gate = await verifyExportAccess(idea);
  if (!gate.allowed) {
    return gate.response;
  }

  const { searchParams } = new URL(request.url);
  const format = searchParams.get("format")?.toLowerCase();

  if (format === "prisma") {
    const rawPrisma = generatePrismaSchema(idea);
    const watermarkedPrisma = applyWatermark(rawPrisma, gate.subscriberId, idea.slug, "javascript");
    return new NextResponse(watermarkedPrisma, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Content-Disposition": `inline; filename="${idea.slug}.prisma"`,
        "Cache-Control": "private, no-cache, no-store, must-revalidate",
      },
    });
  }

  const rawSql = generateSqlSchema(idea);
  const watermarkedSql = applyWatermark(rawSql, gate.subscriberId, idea.slug, "sql");
  return new NextResponse(watermarkedSql, {
    headers: {
      "Content-Type": "application/sql; charset=utf-8",
      "Content-Disposition": `inline; filename="${idea.slug}-schema.sql"`,
      "Cache-Control": "private, no-cache, no-store, must-revalidate",
    },
  });
}
