import { NextResponse } from "next/server";
import { getPublishedIdeaByIdOrSlug } from "@/lib/idea-drops/repository";
import { resolveViewerContext } from "@/lib/idea-drops/resolve-access";

export const dynamic = "force-dynamic";

/**
 * GET /api/ideas/[id]/database
 *
 * Provisioning metadata & connection endpoint for Sourced's instant database bundle.
 * Returns ready-to-paste DATABASE_URL and migration helper commands for Claude Code / Cursor.
 */
export async function GET(request: Request, { params }: { params: { id: string } }) {
  const idea = await getPublishedIdeaByIdOrSlug(params.id);
  if (!idea) {
    return NextResponse.json({ error: "Idea brief not found" }, { status: 404 });
  }

  const viewer = await resolveViewerContext();
  const dbName = `${idea.slug.replace(/-/g, "_")}_dev`;
  const host = process.env.SOURCED_DB_HOST || "db.getsourced.dev";
  const port = process.env.SOURCED_DB_PORT || "5432";
  const user = viewer.userId ? `usr_${viewer.userId.slice(0, 8)}` : "sourced_builder";
  const connectionString = `postgresql://${user}:dev_key_live@${host}:${port}/${dbName}?sslmode=require`;

  return NextResponse.json({
    ok: true,
    ideaId: idea.id,
    slug: idea.slug,
    tier: idea.tier,
    isEntitled: viewer.tier === "studio" || viewer.tier === "builder",
    database: {
      engine: "PostgreSQL 16",
      host,
      port: Number(port),
      database: dbName,
      ssl: true,
      connectionString,
      envSnippet: `DATABASE_URL="${connectionString}"`,
      migrationCommands: {
        prisma: "npx prisma db push",
        sql: `psql "$DATABASE_URL" < ${idea.slug}-schema.sql`,
      },
    },
  });
}
