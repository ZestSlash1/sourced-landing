import { applyNoiseFilters } from "../noise-filters";
import type { PollResult, RawSignalInput } from "../types";

const SUBREDDITS = ["Etsyseller", "shopify", "smallbusiness", "freelance", "SaaS", "webdev"];
const MIN_UPVOTES = 20;
const USER_AGENT = "sourced-ingest-bot/1.0 (by /u/sourced-app)";

interface RedditPost {
  data: {
    id: string;
    title: string;
    selftext: string;
    author: string;
    ups: number;
    created_utc: number;
    permalink: string;
  };
}

let cachedToken: { token: string; expiresAt: number } | null = null;

/**
 * Reddit's "application only" OAuth grant (client_credentials) — enough for
 * read-only public data, no user login needed. Requires a Reddit "script"
 * app's client id/secret (developers.reddit.com -> create app -> script).
 */
async function getAppOnlyToken(): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now()) return cachedToken.token;

  const clientId = process.env.REDDIT_CLIENT_ID;
  const clientSecret = process.env.REDDIT_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error("Missing REDDIT_CLIENT_ID or REDDIT_CLIENT_SECRET environment variables.");
  }

  const res = await fetch("https://www.reddit.com/api/v1/access_token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
      "User-Agent": USER_AGENT,
    },
    body: "grant_type=client_credentials",
  });

  if (!res.ok) throw new Error(`Reddit token request failed: ${res.status}`);
  const body = (await res.json()) as { access_token: string; expires_in: number };

  cachedToken = { token: body.access_token, expiresAt: Date.now() + (body.expires_in - 60) * 1000 };
  return cachedToken.token;
}

/**
 * Reddit poller (Part A1) — pulls new posts from a fixed subreddit list
 * above a minimum upvote threshold. Skipped entirely (returns []) when no
 * app credentials are configured, so the other three pollers still work
 * out of the box without Reddit's OAuth setup.
 */
export async function pollReddit(): Promise<PollResult> {
  if (!process.env.REDDIT_CLIENT_ID || !process.env.REDDIT_CLIENT_SECRET) {
    return { signals: [], noiseFiltered: 0 };
  }

  const token = await getAppOnlyToken();

  const responses = await Promise.all(
    SUBREDDITS.map((sub) =>
      fetch(`https://oauth.reddit.com/r/${sub}/new?limit=30`, {
        headers: { Authorization: `Bearer ${token}`, "User-Agent": USER_AGENT },
      }).then((res) => {
        if (!res.ok) throw new Error(`Reddit fetch failed (r/${sub}): ${res.status}`);
        return res.json() as Promise<{ data: { children: RedditPost[] } }>;
      }),
    ),
  );

  const signals: RawSignalInput[] = [];

  for (const res of responses) {
    for (const { data: post } of res.data.children) {
      if (post.ups < MIN_UPVOTES) continue;

      signals.push({
        source: "reddit",
        url: `https://reddit.com${post.permalink}`,
        title: post.title,
        text: post.selftext || post.title,
        author: post.author,
        engagementMetric: post.ups,
        postedAt: new Date(post.created_utc * 1000).toISOString(),
      });
    }
  }

  const { kept, noiseFiltered } = applyNoiseFilters("reddit", signals);
  return { signals: kept, noiseFiltered };
}
