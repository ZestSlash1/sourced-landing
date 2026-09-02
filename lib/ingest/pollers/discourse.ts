import { applyNoiseFilters } from "../noise-filters";
import { DISCOURSE_INSTANCES, DISCOURSE_REQUEST_DELAY_MS, DISCOURSE_USER_AGENT } from "../poller-sources";
import { stripHtml } from "../strip-html";
import type { PollResult, RawSignalInput } from "../types";

// Kept modest (rather than the spec's "recent topics" full page) because
// each topic fetch is a separate, throttled request — see the cron route's
// maxDuration for the resulting time budget.
const TOPICS_PER_INSTANCE = 8;

interface DiscourseTopic {
  id: number;
  title: string;
  created_at: string;
  // Engagement lives on the topic-list object, not the first post — a post's
  // reply_count/actions_summary come back 0/empty for the topic starter.
  reply_count: number;
  like_count: number;
}

interface DiscourseTopicListResponse {
  topic_list?: { topics: DiscourseTopic[] };
}

interface DiscourseTopicResponse {
  post_stream: {
    posts: {
      username: string;
      // The anonymous JSON API returns `cooked` (HTML), not the `raw`
      // markdown (which requires auth) — absent entirely on some
      // banner/moved/deleted-starter topics.
      cooked?: string;
    }[];
  };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchDiscourseJson<T>(url: string): Promise<T | null> {
  const res = await fetch(url, { headers: { "User-Agent": DISCOURSE_USER_AGENT } });
  if (!res.ok) {
    console.warn(`[discourse] fetch failed (${url}): ${res.status}`);
    return null;
  }
  return (await res.json()) as T;
}

/**
 * Discourse forums poller (poller-expansion-spec.md Source 3) — every
 * Discourse install exposes a public JSON API by appending `.json`, no auth
 * needed. Takes only the topic-starting post (the actual complaint/question)
 * per topic, not the whole reply thread. Requests are throttled
 * one-at-a-time per instance and carry a descriptive User-Agent, since these
 * are independently-run community servers, not a public API product.
 */
export async function pollDiscourse(): Promise<PollResult> {
  const signals: RawSignalInput[] = [];

  for (const baseUrl of DISCOURSE_INSTANCES) {
    const list = await fetchDiscourseJson<DiscourseTopicListResponse>(`${baseUrl}/latest.json?order=created`);
    await sleep(DISCOURSE_REQUEST_DELAY_MS);

    const topics = (list?.topic_list?.topics ?? []).slice(0, TOPICS_PER_INSTANCE);

    for (const topic of topics) {
      const topicData = await fetchDiscourseJson<DiscourseTopicResponse>(`${baseUrl}/t/${topic.id}.json`);
      await sleep(DISCOURSE_REQUEST_DELAY_MS);

      const firstPost = topicData?.post_stream.posts[0];
      if (!firstPost) continue;

      // Some topics (banner/pinned announcements, moved/deleted starters)
      // come back with an empty or missing `cooked` — skip rather than emit
      // a signal with no text.
      const text = firstPost.cooked ? stripHtml(firstPost.cooked) : "";
      if (!text) continue;

      signals.push({
        source: "discourse",
        url: `${baseUrl}/t/${topic.id}`,
        title: topic.title,
        text,
        author: firstPost.username,
        engagementMetric: topic.reply_count + topic.like_count,
        postedAt: topic.created_at,
      });
    }
  }

  const { kept, noiseFiltered } = applyNoiseFilters("discourse", signals);
  return { signals: kept, noiseFiltered };
}
