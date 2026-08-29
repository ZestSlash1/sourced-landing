import type { RawComplaint } from "../types";

interface RedditListingChild {
  data: {
    title: string;
    selftext: string;
    permalink: string;
    created_utc: number;
    ups: number;
  };
}

interface RedditListing {
  data: { children: RedditListingChild[] };
}

/**
 * Reddit's public JSON listing endpoint — read-only, no auth needed. `t`
 * controls the time window ("month" matches ticket-04's cadence).
 */
export async function fetchRedditComplaints(
  subreddit: string,
  { limit = 25, timeframe = "month" }: { limit?: number; timeframe?: string } = {}
): Promise<RawComplaint[]> {
  const url = `https://www.reddit.com/r/${subreddit}/top.json?t=${timeframe}&limit=${limit}`;
  const response = await fetch(url, {
    headers: { "User-Agent": "sourced-ingest/1.0 (idea sourcing bot)" },
  });

  if (!response.ok) {
    throw new Error(`Reddit fetch failed for r/${subreddit}: ${response.status}`);
  }

  const listing = (await response.json()) as RedditListing;

  return listing.data.children
    .filter((child) => child.data.selftext && child.data.selftext.length > 0)
    .map((child): RawComplaint => ({
      platform: "reddit",
      subforum: `r/${subreddit}`,
      rawText: `${child.data.title}\n\n${child.data.selftext}`,
      url: `https://www.reddit.com${child.data.permalink}`,
      date: new Date(child.data.created_utc * 1000).toISOString(),
      engagementRaw: { type: "upvotes", value: child.data.ups },
    }));
}
