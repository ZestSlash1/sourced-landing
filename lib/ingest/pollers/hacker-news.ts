import type { RawSignalInput } from "../types";

const PAIN_PHRASES = [
  "wish there was",
  "wish there were",
  "does anyone know a tool",
  "does anyone know of a tool",
  "i hate that",
  "is there a tool",
  "looking for a tool",
  "i wish someone would build",
];

const MIN_POINTS = 15;

interface AlgoliaHit {
  objectID: string;
  title: string | null;
  comment_text: string | null;
  story_text: string | null;
  author: string | null;
  points: number | null;
  created_at: string;
  url: string | null;
}

/**
 * HN poller (Part A1) — Algolia's HN Search API, no API key required.
 * Searches story/comment text for pain-point phrasing, then filters to a
 * minimum point threshold.
 */
export async function pollHackerNews(): Promise<RawSignalInput[]> {
  const results = await Promise.all(
    PAIN_PHRASES.map((phrase) =>
      fetch(
        `https://hn.algolia.com/api/v1/search_by_date?query=${encodeURIComponent(phrase)}&tags=(story,comment)&numericFilters=points%3E%3D${MIN_POINTS}`,
      ).then((res) => {
        if (!res.ok) throw new Error(`HN Algolia search failed: ${res.status}`);
        return res.json() as Promise<{ hits: AlgoliaHit[] }>;
      }),
    ),
  );

  const seen = new Set<string>();
  const signals: RawSignalInput[] = [];

  for (const { hits } of results) {
    for (const hit of hits) {
      if (seen.has(hit.objectID)) continue;
      seen.add(hit.objectID);

      const text = hit.comment_text ?? hit.story_text ?? hit.title ?? "";
      if (!text) continue;

      signals.push({
        source: "hackernews",
        url: `https://news.ycombinator.com/item?id=${hit.objectID}`,
        title: hit.title,
        text,
        author: hit.author,
        engagementMetric: hit.points ?? 0,
        postedAt: hit.created_at,
      });
    }
  }

  return signals;
}
