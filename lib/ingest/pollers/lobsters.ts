import type { RawSignalInput } from "../types";

const MIN_SCORE = 5;
const MIN_COMMENTS = 2;

interface LobstersStory {
  short_id: string;
  created_at: string;
  title: string;
  url: string;
  score: number;
  comment_count: number;
  description_plain: string | null;
  submitter_user: string | { username: string } | null;
  short_id_url: string;
}

function authorOf(submitter: LobstersStory["submitter_user"]): string | null {
  if (!submitter) return null;
  return typeof submitter === "string" ? submitter : submitter.username;
}

/**
 * Lobste.rs poller — public JSON API, no key required. HN-adjacent audience
 * and prose style, which is the whole point: it's a second source that talks
 * about the same problems HN does, giving clustering real cross-platform
 * overlap to find. Politely spaced (one request at a time, no burst).
 */
export async function pollLobsters(): Promise<RawSignalInput[]> {
  const endpoints = ["https://lobste.rs/hottest.json", "https://lobste.rs/newest.json?page=1"];

  const seen = new Set<string>();
  const signals: RawSignalInput[] = [];

  for (const endpoint of endpoints) {
    let stories: LobstersStory[] = [];
    try {
      const res = await fetch(endpoint);
      if (!res.ok) {
        console.warn(`[lobsters] fetch failed (${endpoint}): ${res.status}`);
        continue;
      }
      stories = (await res.json()) as LobstersStory[];
    } catch (err) {
      console.warn(`[lobsters] fetch threw (${endpoint}):`, err);
      continue;
    }

    for (const s of stories) {
      if (seen.has(s.short_id)) continue;
      seen.add(s.short_id);

      if (s.score < MIN_SCORE || s.comment_count < MIN_COMMENTS) continue;

      const text = s.description_plain?.trim() ? s.description_plain : s.title;

      signals.push({
        source: "lobsters",
        url: s.short_id_url,
        title: s.title,
        text,
        author: authorOf(s.submitter_user),
        engagementMetric: s.score + s.comment_count,
        postedAt: s.created_at,
      });
    }

    // be polite — lobste.rs documents no hard rate limit but asks for restraint
    await new Promise((r) => setTimeout(r, 1000));
  }

  return signals;
}
