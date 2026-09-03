import { applyNoiseFilters } from "../noise-filters";
import { BLUESKY_SEARCH_QUERIES } from "../poller-sources";
import type { PollResult, RawSignalInput } from "../types";

const POSTS_PER_QUERY = 50;

interface BlueskyPost {
  uri: string; // at://did:plc:xxx/app.bsky.feed.post/xxxxx
  author: { handle: string };
  record: { text: string; createdAt: string };
  likeCount?: number;
  repostCount?: number;
}

interface BlueskySearchResponse {
  posts: BlueskyPost[];
}

let cachedSession: { accessJwt: string; expiresAt: number } | null = null;

/**
 * app.bsky.feed.searchPosts requires an authenticated session even though
 * it's otherwise a "public" API endpoint — confirmed against the live API
 * (ingest-expansion-v2-spec.md Part 2 flagged this as needing verification;
 * anonymous requests come back 403). A free App Password
 * (bsky.app -> Settings -> App Passwords) is enough, no OAuth app review.
 */
async function getSession(): Promise<string> {
  if (cachedSession && cachedSession.expiresAt > Date.now()) return cachedSession.accessJwt;

  const identifier = process.env.BLUESKY_HANDLE;
  const password = process.env.BLUESKY_APP_PASSWORD;
  if (!identifier || !password) {
    throw new Error("Missing BLUESKY_HANDLE or BLUESKY_APP_PASSWORD environment variables.");
  }

  const res = await fetch("https://bsky.social/xrpc/com.atproto.server.createSession", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ identifier, password }),
  });
  if (!res.ok) throw new Error(`Bluesky createSession failed: ${res.status}`);
  const body = (await res.json()) as { accessJwt: string };

  // Session JWTs are short-lived (~2h); re-authenticate well before expiry
  // rather than tracking the exact TTL, since createSession doesn't return one.
  cachedSession = { accessJwt: body.accessJwt, expiresAt: Date.now() + 60 * 60 * 1000 };
  return cachedSession.accessJwt;
}

function postUrl(uri: string, handle: string): string {
  const rkey = uri.split("/").pop();
  return `https://bsky.app/profile/${handle}/post/${rkey}`;
}

/**
 * Bluesky poller (ingest-expansion-v2-spec.md Part 2) — AT Protocol's public
 * search API, reusing the HN pain-phrase list plus hashtags Bluesky's
 * dev/indie-maker community actively uses. Skipped entirely (returns [])
 * when no app-password credentials are configured, matching pollReddit's
 * no-op-without-credentials shape.
 */
export async function pollBluesky(): Promise<PollResult> {
  if (!process.env.BLUESKY_HANDLE || !process.env.BLUESKY_APP_PASSWORD) {
    return { signals: [], noiseFiltered: 0 };
  }

  const accessJwt = await getSession();

  const responses = await Promise.all(
    BLUESKY_SEARCH_QUERIES.map((query) =>
      fetch(
        `https://public.api.bsky.app/xrpc/app.bsky.feed.searchPosts?q=${encodeURIComponent(query)}&limit=${POSTS_PER_QUERY}`,
        { headers: { Authorization: `Bearer ${accessJwt}` } },
      ).then((res) => {
        if (!res.ok) {
          console.warn(`[bluesky] search failed ("${query}"): ${res.status}`);
          return { posts: [] } as BlueskySearchResponse;
        }
        return res.json() as Promise<BlueskySearchResponse>;
      }),
    ),
  );

  const seen = new Set<string>();
  const signals: RawSignalInput[] = [];

  for (const { posts } of responses) {
    for (const post of posts) {
      if (seen.has(post.uri)) continue;
      seen.add(post.uri);

      signals.push({
        source: "bluesky",
        url: postUrl(post.uri, post.author.handle),
        title: null,
        text: post.record.text,
        author: post.author.handle,
        engagementMetric: (post.likeCount ?? 0) + (post.repostCount ?? 0),
        postedAt: post.record.createdAt,
      });
    }
  }

  const { kept, noiseFiltered } = applyNoiseFilters("bluesky", signals);
  return { signals: kept, noiseFiltered };
}
