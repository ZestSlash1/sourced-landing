import { NextResponse } from "next/server";
import { getPublishedIdeaByIdOrSlug } from "@/lib/idea-drops/repository";
import { generatePrismaSchema, generateSqlSchema } from "@/lib/idea-drops/sql-schema-generator";

export const dynamic = "force-dynamic";

/**
 * GET /api/ideas/[id]/schema
 *
 * Query parameters:
 *   - format=prisma: returns schema.prisma
 *   - format=sql (default): returns PostgreSQL schema.sql
 *
 * Returns raw database schema DDL for direct terminal / editor consumption:
 *   curl -s https://www.getsourced.dev/api/ideas/[slug]/schema > schema.sql
 *   curl -s "https://www.getsourced.dev/api/ideas/[slug]/schema?format=prisma" > schema.prisma
 */
export async function GET(request: Request, { params }: { params: { id: string } }) {
  const idea = await getPublishedIdeaByIdOrSlug(params.id);
  if (!idea) {
    return new NextResponse("Idea brief not found", { status: 404 });
  }

  const { searchParams } = new URL(request.url);
  const format = searchParams.get("format")?.toLowerCase();

  if (format === "prisma") {
    const prismaContent = generatePrismaSchema(idea);
    return new NextResponse(prismaContent, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Content-Disposition": `inline; filename="${idea.slug}.prisma"`,
        "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
      },
    });
  }

  const sqlContent = generateSqlSchema(idea);
  return new NextResponse(sqlContent, {
    headers: {
      "Content-Type": "application/sql; charset=utf-8",
      "Content-Disposition": `inline; filename="${idea.slug}-schema.sql"`,
      "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}
