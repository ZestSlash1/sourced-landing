import { NextRequest, NextResponse } from "next/server";
import { listAllForAdmin, upsertIdea } from "@/lib/idea-drops/store";
import { isAuthorizedAdmin } from "@/lib/idea-drops/require-admin";
import type { IdeaDrop } from "@/types/idea-drop";

export async function GET(request: NextRequest) {
  if (!isAuthorizedAdmin(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return NextResponse.json({ ideas: listAllForAdmin() });
}

export async function POST(request: NextRequest) {
  if (!isAuthorizedAdmin(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as IdeaDrop;
  // upsertIdea runs the Task 3 evidence gate: status can never come back as
  // "published" here unless validateEvidence actually passes, regardless of
  // what the caller sent.
  const saved = await upsertIdea(body);
  return NextResponse.json(saved, { status: 201 });
}
