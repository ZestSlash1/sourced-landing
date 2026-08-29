import { completeJson } from "@/lib/llm/anthropic";
import type { Evidence } from "@/types/idea-drop";
import type { RawComplaint } from "./types";

const SYSTEM_PROMPT = `You screen raw forum/review/job-post text for
Sourced, a product that turns real complaints into micro-SaaS ideas.

Given one raw text, decide: does it describe a genuine, specific problem
someone would pay to solve? Reject rants with no concrete problem, memes,
jokes, off-topic threads, and vague venting with no actionable detail.

Return ONLY a JSON object, no preamble, no markdown fences:
- If it qualifies: {"qualifies": true, "quote": string, "summary": string}
  - "quote": a paraphrase of the core complaint, under 200 characters. Never
    copy more than ~15 words verbatim from the source text — paraphrase for
    both copyright and consistency reasons.
  - "summary": a one-line problem summary.
- If it doesn't qualify: {"qualifies": false}`;

interface ScreeningResult {
  qualifies: boolean;
  quote?: string;
  summary?: string;
}

/**
 * Turns a RawComplaint into a clean Evidence item, or null if the LLM
 * decides it isn't substantive enough to count as evidence.
 */
export async function toEvidence(raw: RawComplaint): Promise<Evidence | null> {
  const result = await completeJson<ScreeningResult>({
    system: SYSTEM_PROMPT,
    user: raw.rawText,
    maxTokens: 512,
  });

  if (!result.qualifies || !result.quote) return null;

  return {
    platform: raw.platform,
    subforum: raw.subforum,
    quote: result.quote.slice(0, 200),
    url: raw.url,
    date: raw.date,
    engagementMetric: raw.engagementRaw
      ? {
          type: raw.engagementRaw.type as NonNullable<Evidence["engagementMetric"]>["type"],
          value: raw.engagementRaw.value,
        }
      : undefined,
  };
}
