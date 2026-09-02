import { applyNoiseFilters } from "../noise-filters";
import {
  MASTODON_HASHTAGS,
  MASTODON_INSTANCES,
  MASTODON_REQUEST_DELAY_MS,
  MASTODON_USER_AGENT,
} from "../poller-sources";
import { stripHtml } from "../strip-html";
import type { PollResult, RawSignalInput } from "../types";

const MIN_POST_LENGTH = 40;
const POSTS_PER_TIMELINE = 40;

interface MastodonStatus {
  id: string;
  url: string;
  content: string;
  created_at: string;
  favourites_count: number;
  reblogs_count: number;
  reblog: unknown | null;
  account: { display_name: string; acct: string };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Mastodon poller (poller-expansion-spec.md Source 4) — keyless public
 * timeline API, scoped to dev-relevant hashtags per instance rather than the
 * unfiltered public firehose for better signal density. Skips boosts
 * (`reblog` present) so only original posts are ingested. Requests are
 * throttled per instance since public Mastodon rate limits are per-IP.
 */
export async function pollMastodon(): Promise<PollResult> {
  const signals: RawSignalInput[] = [];

  for (const instance of MASTODON_INSTANCES) {
    for (const hashtag of MASTODON_HASHTAGS) {
      const res = await fetch(
        `https://${instance}/api/v1/timelines/tag/${encodeURIComponent(hashtag)}?limit=${POSTS_PER_TIMELINE}`,
        { headers: { "User-Agent": MASTODON_USER_AGENT } },
      );
      await sleep(MASTODON_REQUEST_DELAY_MS);

      if (!res.ok) {
        console.warn(`[mastodon] fetch failed (${instance} #${hashtag}): ${res.status}`);
        continue;
      }

      const statuses = (await res.json()) as MastodonStatus[];
      for (const status of statuses) {
        if (status.reblog) continue;

        const text = stripHtml(status.content);
        if (text.length < MIN_POST_LENGTH) continue;

        signals.push({
          source: "mastodon",
          url: status.url,
          title: null,
          text,
          author: status.account.display_name || status.account.acct,
          engagementMetric: status.favourites_count + status.reblogs_count,
          postedAt: status.created_at,
        });
      }
    }
  }

  const { kept, noiseFiltered } = applyNoiseFilters("mastodon", signals);
  return { signals: kept, noiseFiltered };
}
