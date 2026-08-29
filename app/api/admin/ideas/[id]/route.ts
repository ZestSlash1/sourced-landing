import { NextRequest, NextResponse } from "next/server";
import { getByIdOrSlug, patchIdea } from "@/lib/idea-drops/store";
import { isAuthorizedAdmin } from "@/lib/idea-drops/require-admin";
import { generateAgentPrompts } from "@/lib/prompts/generate-agent-prompts";
import type { IdeaDrop } from "@/types/idea-drop";

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  if (!isAuthorizedAdmin(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const idea = getByIdOrSlug(params.id);
  if (!idea) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(idea);
}

function buildBriefChanged(before: IdeaDrop | undefined, patch: Partial<IdeaDrop>): boolean {
  if (!before || !patch.buildBrief) return false;
  return JSON.stringify(before.buildBrief) !== JSON.stringify(patch.buildBrief);
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  if (!isAuthorizedAdmin(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const before = getByIdOrSlug(params.id);
  if (!before) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const patch = (await request.json()) as Partial<IdeaDrop>;

  // Phase 2 Task 2.2: regenerate agent prompts automatically, but only when
  // buildBrief actually changed — not on every save, to avoid burning LLM
  // calls on unrelated edits (e.g. fixing a typo in the title).
  if (buildBriefChanged(before, patch)) {
    const merged = { ...before, ...patch };
    patch.agentPrompts = await generateAgentPrompts(merged);
  }

  const saved = await patchIdea(params.id, patch);
  if (!saved) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(saved);
}
