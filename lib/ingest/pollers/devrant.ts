import { applyNoiseFilters } from "../noise-filters";
import type { PollResult, RawSignalInput } from "../types";

const MIN_SCORE = 0;

interface DevRantRant {
  id: number;
  text: string;
  score: number;
  created_time: number; // unix seconds
  num_comments: number;
  user_username: string;
}

interface DevRantResponse {
  success: boolean;
  rants: DevRantRant[];
}

/**
 * DevRant poller (ingest-expansion-v2-spec.md Part 3, originally scoped in
 * sourced-ingest-volume-spec.md Part 2b but never built). Unofficial,
 * reverse-engineered API — `app=3` is required (requests without it are
 * rejected) and the endpoint is `/api/devrant/rants`, not `/api/rants` as
 * the volume spec assumed; both verified against the live API before
 * landing this. Monitor for breakage: this can change shape without notice.
 */
export async function pollDevRant(): Promise<PollResult> {
  const res = await fetch("https://devrant.com/api/devrant/rants?sort=recent&limit=50&app=3");
  if (!res.ok) {
    console.warn(`[devrant] fetch failed: ${res.status}`);
    return { signals: [], noiseFiltered: 0 };
  }

  const body = (await res.json()) as DevRantResponse;
  const signals: RawSignalInput[] = [];

  for (const rant of body.rants ?? []) {
    if (rant.score < MIN_SCORE) continue;

    signals.push({
      source: "devrant",
      url: `https://devrant.com/rants/${rant.id}`,
      title: null, // devRant posts have no title — text is the only field
      text: rant.text,
      author: rant.user_username,
      engagementMetric: rant.score + rant.num_comments,
      postedAt: new Date(rant.created_time * 1000).toISOString(),
    });
  }

  const { kept, noiseFiltered } = applyNoiseFilters("devrant", signals);
  return { signals: kept, noiseFiltered };
}
