import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/require-admin";
import { checkCompetitiveLandscape } from "@/lib/ingest/competitive-landscape";
import { getIdeaById, upsertIdeaDrop } from "@/lib/idea-drops/repository";

/**
 * POST /api/admin/ideas/[id]/recheck-competitive — admin-triggered manual
 * re-run of the competitive gap check (sourced-competitive-gap-spec.md
 * "Re-check policy"). Not run automatically on every pipeline pass, since
 * that would re-spend the search cost on every idea on every draft run —
 * this exists for when an admin suspects the landscape has changed since
 * the original check. On failure the idea's existing competitiveLandscape
 * (if any) is left untouched rather than being cleared.
 */
export async function POST(request: Request, { params }: { params: { id: string } }) {
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

  try {
    const { result } = await checkCompetitiveLandscape(existing.problem.summary);
    const saved = await upsertIdeaDrop({ ...existing, competitiveLandscape: result });
    return NextResponse.json(saved);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 502 },
    );
  }
}
