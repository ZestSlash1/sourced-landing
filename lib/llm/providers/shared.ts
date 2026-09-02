// Shared between lib/llm/providers/ollama.ts and openrouter.ts: both speak
// the same {is_complaint, problem_statement, domain, confidence} JSON
// contract, just via different transports. Kept here rather than duplicated
// so the two adapters can't silently drift on parsing/normalization rules.
//
// The prompt text itself also lives here (buildClassificationPrompt) so both
// providers send byte-identical prompts — classifier-parity.ts only means
// something if neither adapter is quietly seeing an easier/harder phrasing.
import { TOPICS } from "@/lib/topics";
import type { ProviderClassifyInput } from "./types";

export interface RawClassification {
  is_complaint: boolean;
  problem_statement?: string;
  domain?: string;
  confidence: number;
}

export interface NormalizedClassification {
  isComplaint: boolean;
  problemStatement: string | null;
  domain: string | null;
  confidence: number;
}

export function truncate(text: string, max = 1500): string {
  return text.length > max ? `${text.slice(0, max)}...` : text;
}

/** Identical prompt for both providers — see comment at the top of this file. */
export function buildClassificationPrompt(input: ProviderClassifyInput): string {
  return `You are a classifier. Given a forum/issue-tracker post, return ONLY valid JSON
matching this exact schema, with no prose before or after:

{
  "is_complaint": boolean,
  "problem_statement": string | null,  // ONLY if is_complaint is true. One normalised sentence in this fixed shape: "<who> can't <what they're blocked from doing>". Be concrete about the actor and the blocked action. This sentence will be embedded and compared against other problem statements, so keep the grammatical shape and voice consistent — no platform-specific jargon, no quoting the source verbatim.
  "domain": string | null,  // ONLY if is_complaint is true, the single closest match from this fixed list, exactly as written: ${TOPICS.map((t) => `"${t}"`).join(", ")}
  "confidence": number  // 0.0 to 1.0, your confidence in the is_complaint classification
}

Definition of "complaint" (isComplaint: true):
A complaint means the poster is stuck, frustrated, or actively affected by
something not working the way they need it to — right now, for them personally.
This includes: bugs blocking their work, missing functionality they need
urgently, workarounds they're forced into, or explicit frustration/annoyance.

Do NOT mark as a complaint (isComplaint: false):
- A formal feature request or "would be nice" suggestion with no stated urgency
  or frustration (e.g. "we should think about adding X support")
- Internal maintainer-to-maintainer discussion about naming, code style, or
  implementation details (e.g. GitHub/GitLab issue threads between contributors
  debating how to structure something)
- A neutral request for advice, opinions, or suggestions where the poster isn't
  blocked or upset (e.g. "any suggestions on how to improve the look of X?")
- General discussion, announcements, or questions with no unmet need expressed

Examples:
- "We should think about adding PostGIS support" → isComplaint: false
  (feature suggestion, no stated urgency)
- "I can't query geolocation data without writing raw SQL, this is really
  slowing me down" → isComplaint: true (blocked, frustrated)
- "Should this be renamed to TestCoverage for clarity?" → isComplaint: false
  (internal naming discussion)
- "I'd appreciate any suggestions on what changes would make the app look
  better" → isComplaint: false (neutral advice request, not blocked or upset)
- "I've spent 3 hours trying to get X working and nothing in the docs explains
  how" → isComplaint: true (frustration + blocked)

If is_complaint is false, problem_statement and domain must be null.

Post platform: ${input.platform}
Post title: ${input.title ?? ""}
Post body: ${truncate(input.body)}`;
}

/** Pulls the first top-level JSON object out of a model response, tolerating markdown fences or stray text around it. */
export function extractJson(text: string): RawClassification {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced ? fenced[1] : text;
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  if (start === -1 || end === -1 || end < start) {
    throw new Error("Model response did not contain a JSON object.");
  }
  return JSON.parse(candidate.slice(start, end + 1)) as RawClassification;
}

export function normalizeClassification(raw: RawClassification): NormalizedClassification {
  if (typeof raw.is_complaint !== "boolean" || typeof raw.confidence !== "number") {
    throw new Error("Malformed classification response: missing is_complaint/confidence.");
  }
  const confidence = Math.max(0, Math.min(1, raw.confidence));
  if (!raw.is_complaint) {
    return { isComplaint: false, problemStatement: null, domain: null, confidence };
  }
  const problemStatement = raw.problem_statement?.trim() || null;
  const domain = raw.domain?.trim() || null;
  return { isComplaint: true, problemStatement, domain, confidence };
}
