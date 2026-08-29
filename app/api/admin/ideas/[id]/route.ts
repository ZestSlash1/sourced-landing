import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/require-admin";
import { getIdeaById, upsertIdeaDrop } from "@/lib/idea-drops/repository";
import type { IdeaDrop } from "@/types/idea-drop";

/**
 * PATCH /api/admin/ideas/[id] — partial update, admin only. Merges the
 * request body onto the existing row and writes through upsertIdeaDrop, so
 * the evidence gate still runs (a PATCH carrying status: "published" with
 * thin evidence lands as needs_evidence, same as any other write path).
 */
export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const check = await requireAdmin();
  if (check.ok === false) {
    return NextResponse.json(
      { error: check.status === 401 ? "Unauthorized" : "Forbidden" },
      { status: check.status },
    );
  }

  const existing = await getIdeaById(params.id);
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const patch = (await request.json()) as Partial<IdeaDrop>;
  const merged: IdeaDrop = { ...existing, ...patch, id: existing.id };

  const saved = await upsertIdeaDrop(merged);
  return NextResponse.json(saved);
}
