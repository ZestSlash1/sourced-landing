import type { RawSignalInput } from "../types";

// discuss/watercooler/help are Dev.to's opinion/venting/ask tags — same
// complaint-prose register as HN ("I'm frustrated that...", "why doesn't
// anyone build...") rather than tutorial content, which the rest of the
// tag space is dominated by.
const TAGS = ["discuss", "watercooler", "help"];

const MIN_REACTIONS = 5;
const MIN_COMMENTS = 3;

// Recurring weekly/monthly discussion-thread titles in the discuss/watercooler
// tags. These aren't complaint content — they're the same templated prompt
// posted on a schedule — so every occurrence clusters as a false-positive
// "recurring complaint" with its own past instances. Matched as a
// case-insensitive substring against the title.
const RECURRING_THREAD_TITLES = [
  "what was your win this week",
  "meme monday",
  "what are you working on this week",
  "what's everyone working on this week",
];

export function isRecurringThreadTitle(title: string): boolean {
  const normalized = title.toLowerCase();
  return RECURRING_THREAD_TITLES.some((pattern) => normalized.includes(pattern));
}

interface DevToArticle {
  id: number;
  title: string;
  description: string | null;
  url: string;
  published_at: string | null;
  user: { username: string } | null;
  positive_reactions_count: number;
  comments_count: number;
}

/**
 * Dev.to poller — public REST API, no key required. Pulls top articles from
 * opinion/discussion tags and filters to ones with enough engagement to show
 * the complaint actually resonated, not just a drive-by post.
 */
export async function pollDevTo(): Promise<RawSignalInput[]> {
  const responses = await Promise.all(
    TAGS.map((tag) =>
      fetch(`https://dev.to/api/articles?tag=${encodeURIComponent(tag)}&top=30`).then(async (res) => {
        if (!res.ok) {
          console.warn(`[devto] fetch failed (tag=${tag}): ${res.status}`);
          return [] as DevToArticle[];
        }
        return res.json() as Promise<DevToArticle[]>;
      }),
    ),
  );

  const seen = new Set<number>();
  const signals: RawSignalInput[] = [];

  for (const articles of responses) {
    for (const a of articles) {
      if (seen.has(a.id)) continue;
      seen.add(a.id);

      if (a.positive_reactions_count < MIN_REACTIONS || a.comments_count < MIN_COMMENTS) continue;
      if (isRecurringThreadTitle(a.title)) continue;

      const text = a.description ?? a.title;
      if (!text) continue;

      signals.push({
        source: "devto",
        url: a.url,
        title: a.title,
        text,
        author: a.user?.username ?? null,
        engagementMetric: a.positive_reactions_count + a.comments_count,
        postedAt: a.published_at,
      });
    }
  }

  return signals;
}
