import "server-only";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import type { IdeaDrop } from "@/types/idea-drop";
import { applyEvidenceGate } from "./publish-gate";
import { ideaDropToRow, rowToIdeaDrop, type IdeaDropRow } from "./mapping";

const TABLE = "idea_drops";

/** Every published idea, newest first. Never includes draft/needs_evidence rows, for any tier. */
export async function listPublishedIdeas(): Promise<IdeaDrop[]> {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from(TABLE)
    .select("*")
    .eq("status", "published")
    .order("published_at", { ascending: false });

  if (error) throw new Error(`listPublishedIdeas: ${error.message}`);
  return (data as IdeaDropRow[]).map(rowToIdeaDrop);
}

/**
 * A single idea by id or slug, or null if it doesn't exist, is not published,
 * or is malformed. Route handlers decide 404 vs teaser vs full from this.
 */
export async function getPublishedIdeaByIdOrSlug(idOrSlug: string): Promise<IdeaDrop | null> {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from(TABLE)
    .select("*")
    .eq("status", "published")
    .or(`id.eq.${idOrSlug},slug.eq.${idOrSlug}`)
    .maybeSingle();

  if (error) throw new Error(`getPublishedIdeaByIdOrSlug: ${error.message}`);
  if (!data) return null;
  return rowToIdeaDrop(data as IdeaDropRow);
}

/**
 * Creates or updates an idea, running the evidence gate first. The caller's
 * requested status is only honored if the evidence clears the gate — a
 * direct call with `status: "published"` and thin evidence still lands as
 * `needs_evidence`, since applyEvidenceGate runs here, in the write path,
 * unconditionally.
 */
export async function upsertIdeaDrop(idea: IdeaDrop): Promise<IdeaDrop> {
  const gated = applyEvidenceGate(idea, idea.status);
  const supabase = getSupabaseServerClient();

  const { data, error } = await supabase
    .from(TABLE)
    .upsert(ideaDropToRow(gated))
    .select()
    .single();

  if (error) throw new Error(`upsertIdeaDrop: ${error.message}`);
  return rowToIdeaDrop(data as IdeaDropRow);
}
