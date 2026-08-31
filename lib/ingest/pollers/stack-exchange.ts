import { applyNoiseFilters } from "../noise-filters";
import type { PollResult, RawSignalInput } from "../types";

// Sites worth mining for "I do this by hand, wish there were a tool"
// workflow-gap questions. Webmasters/SO cover the general builder audience;
// the others map to Sourced's existing topic list. softwareengineering/
// webapps/ux/pm skew toward tool/workflow complaints rather than code Q&A,
// which is where the cross-platform overlap with HN prose actually lives.
// startups.stackexchange.com is not in this list: SE retired/merged it, so
// its api_site_parameter no longer resolves (verified against /2.3/sites).
const SITES = [
  "webmasters",
  "softwarerecs",
  "workplace",
  "softwareengineering",
  "webapps",
  "ux",
  "pm",
  "serverfault",
  "superuser",
];

const MAX_ANSWERS = 1; // unanswered or barely-answered = an unmet need
const MIN_SCORE = 0;

interface SEQuestion {
  question_id: number;
  title: string;
  body?: string;
  link: string;
  owner?: { display_name?: string };
  score: number;
  answer_count: number;
  creation_date: number; // unix seconds
}

interface SEResponse {
  items: SEQuestion[];
}

/**
 * Stack Exchange poller (Part A1) — public API, no key required for the
 * anonymous quota (300 req/day, plenty for a daily cron per site). Pulls
 * low-answer questions describing a workflow gap.
 */
export async function pollStackExchange(): Promise<PollResult> {
  const responses = await Promise.all(
    SITES.map((site) =>
      fetch(
        `https://api.stackexchange.com/2.3/questions?order=desc&sort=creation&site=${site}&pagesize=30&filter=withbody`,
      ).then((res) => {
        if (!res.ok) throw new Error(`Stack Exchange fetch failed (${site}): ${res.status}`);
        return res.json() as Promise<SEResponse>;
      }),
    ),
  );

  const signals: RawSignalInput[] = [];

  for (const { items } of responses) {
    for (const q of items) {
      if (q.answer_count > MAX_ANSWERS) continue;
      if (q.score < MIN_SCORE) continue;

      signals.push({
        source: "stackexchange",
        url: q.link,
        title: q.title,
        text: q.body ?? q.title,
        author: q.owner?.display_name ?? null,
        engagementMetric: q.score,
        postedAt: new Date(q.creation_date * 1000).toISOString(),
      });
    }
  }

  const { kept, noiseFiltered } = applyNoiseFilters("stackexchange", signals);
  return { signals: kept, noiseFiltered };
}
