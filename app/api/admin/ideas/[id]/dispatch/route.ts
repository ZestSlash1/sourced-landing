import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/require-admin";
import { getIdeaById } from "@/lib/idea-drops/repository";
import { dispatchWeeklyDrop, renderDropEmail } from "@/lib/email/dispatcher";

export const dynamic = "force-dynamic";

/**
 * POST /api/admin/ideas/[id]/dispatch
 * Broadcasts a published idea drop to active subscribers.
 * Protected by admin authorization.
 * Supports { dryRun: true } to inspect recipient count and preview before sending.
 */
export async function POST(request: Request, { params }: { params: { id: string } }) {
  const check = await requireAdmin();
  if (check.ok === false) {
    return NextResponse.json(
      { error: check.status === 401 ? "Unauthorized" : "Forbidden" },
      { status: check.status }
    );
  }

  const idea = await getIdeaById(params.id);
  if (!idea) {
    return NextResponse.json({ error: "Idea drop not found" }, { status: 404 });
  }

  if (idea.status !== "published") {
    return NextResponse.json(
      { error: "Only published drops can be broadcast to subscribers." },
      { status: 400 }
    );
  }

  const body = (await request.json().catch(() => ({}))) as { dryRun?: boolean };
  const dryRun = Boolean(body?.dryRun);

  const result = await dispatchWeeklyDrop(idea, { dryRun });
  const preview = renderDropEmail(idea);

  return NextResponse.json({
    ok: true,
    ...result,
    preview: {
      subject: preview.subject,
      text: preview.text,
    },
  });
}