import "server-only";
import { createHash } from "node:crypto";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import type { Evidence } from "@/types/idea-drop";
import { canonicalEvidenceUrl } from "./evidence-summary";

const EVENT_TYPE = "opportunity_watch";
export interface OpportunityWatch { ideaId: string; evidenceFingerprint: string; reviewedAt: string }

export function evidenceFingerprint(evidence: Evidence[]): string {
  const records = evidence.map((e) => JSON.stringify([canonicalEvidenceUrl(e.url), e.date, e.quote, e.platform]));
  return createHash("sha256").update(JSON.stringify(Array.from(new Set(records)).sort())).digest("hex");
}

function watchId(userId: string, ideaId: string): string {
  const hash = createHash("sha256").update(`${EVENT_TYPE}:${userId}:${ideaId}`).digest("hex");
  return `${hash.slice(0, 8)}-${hash.slice(8, 12)}-4${hash.slice(13, 16)}-a${hash.slice(17, 20)}-${hash.slice(20, 32)}`;
}

/** Durable account state in Sourced's existing events store; no analytics best-effort writes. */
export async function listOpportunityWatches(userId: string): Promise<OpportunityWatch[]> {
  const { data, error } = await getSupabaseServerClient().from("events")
    .select("metadata").eq("event_type", EVENT_TYPE).eq("user_id", userId);
  if (error) throw new Error(`listOpportunityWatches: ${error.message}`);
  return (data ?? []).flatMap(({ metadata: m }) =>
    m && typeof m.ideaId === "string" && typeof m.evidenceFingerprint === "string" && typeof m.reviewedAt === "string"
      ? [{ ideaId: m.ideaId, evidenceFingerprint: m.evidenceFingerprint, reviewedAt: m.reviewedAt }] : []);
}

export async function saveOpportunityWatch(userId: string, ideaId: string, evidence: Evidence[], sessionId: string) {
  const metadata: OpportunityWatch = { ideaId, evidenceFingerprint: evidenceFingerprint(evidence), reviewedAt: new Date().toISOString() };
  const { error } = await getSupabaseServerClient().from("events").upsert({
    id: watchId(userId, ideaId), event_type: EVENT_TYPE, user_id: userId, session_id: sessionId, metadata,
  }, { onConflict: "id" });
  if (error) throw new Error(`saveOpportunityWatch: ${error.message}`);
  return metadata;
}

export async function removeOpportunityWatch(userId: string, ideaId: string) {
  const { error } = await getSupabaseServerClient().from("events").delete()
    .eq("id", watchId(userId, ideaId)).eq("user_id", userId).eq("event_type", EVENT_TYPE);
  if (error) throw new Error(`removeOpportunityWatch: ${error.message}`);
}
