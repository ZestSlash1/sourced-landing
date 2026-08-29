import "server-only";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import type { IdeaDrop } from "@/types/idea-drop";
import { applyEvidenceGate } from "./publish-gate";
import { ideaDropToRow, rowToIdeaDrop, type IdeaDropRow } from "./mapping";

const TABLE = "idea_drops";

/**
 * Every published idea, newest first. Never includes draft/needs_evidence/
 * pending_review rows, for any tier. When `topics` is given and non-empty,
 * filters to ideas whose tags overlap it (Phase 4 Part C1) — an idea's
 * topic tag(s) live in the existing `tags` column, no separate column
 * needed.
 */
export async function listPublishedIdeas(topics?: string[]): Promise<IdeaDrop[]> {
  const supabase = getSupabaseServerClient();
  let query = supabase.from(TABLE).select("*").eq("status", "published");

  if (topics && topics.length > 0) {
    query = query.overlaps("tags", topics);
  }

  const { data, error } = await query.order("published_at", { ascending: false });

  if (error) throw new Error(`listPublishedIdeas: ${error.message}`);
  return (data as IdeaDropRow[]).map(rowToIdeaDrop);
}

/**
 * The curated default for logged-out visitors and signed-in users who
 * haven't picked topics yet (Part C1's "curated popular subset" option) —
 * admin-marked `featured` published ideas, newest first.
 */
export async function listFeaturedIdeas(): Promise<IdeaDrop[]> {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from(TABLE)
    .select("*")
    .eq("status", "published")
    .eq("featured", true)
    .order("published_at", { ascending: false });

  if (error) throw new Error(`listFeaturedIdeas: ${error.message}`);
  return (data as IdeaDropRow[]).map(rowToIdeaDrop);
}

/** Drafts awaiting admin approval (Part A4), oldest first so the queue clears in order. */
export async function listPendingReviewIdeas(): Promise<IdeaDrop[]> {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from(TABLE)
    .select("*")
    .eq("status", "pending_review")
    .order("created_at", { ascending: true });

  if (error) throw new Error(`listPendingReviewIdeas: ${error.message}`);
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

/** Every idea regardless of status, for the admin dashboard. Most recently updated first. */
export async function listAllIdeas(): Promise<IdeaDrop[]> {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from(TABLE)
    .select("*")
    .order("updated_at", { ascending: false });

  if (error) throw new Error(`listAllIdeas: ${error.message}`);
  return (data as IdeaDropRow[]).map(rowToIdeaDrop);
}

/**
 * A single idea by id, any status — for admin editing. Unlike
 * getPublishedIdeaByIdOrSlug, this has no status filter, so admin routes
 * must guard access themselves (via requireAdmin), not rely on this to hide
 * drafts.
 */
export async function getIdeaById(id: string): Promise<IdeaDrop | null> {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from(TABLE)
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) throw new Error(`getIdeaById: ${error.message}`);
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
