import { NextResponse } from "next/server";
import { listPublishedIdeas } from "@/lib/idea-drops/repository";
import { resolveUserTier } from "@/lib/idea-drops/resolve-user-tier";
import { scopeToTier } from "@/lib/idea-drops/scope-to-tier";

/** GET /api/ideas — published ideas only, each scoped to the caller's tier. */
export async function GET(request: Request) {
  const userTier = resolveUserTier(request);
  const ideas = await listPublishedIdeas();
  const scoped = ideas.map((idea) => scopeToTier(idea, userTier));
  return NextResponse.json(scoped);
}
