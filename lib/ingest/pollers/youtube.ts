import { applyNoiseFilters } from "../noise-filters";
import { YOUTUBE_CHANNEL_HANDLES, YOUTUBE_QUOTA_WARN_THRESHOLD } from "../poller-sources";
import type { PollResult, RawSignalInput } from "../types";

const MIN_COMMENT_LENGTH = 40;
const VIDEO_LOOKBACK_DAYS = 30;
const MAX_VIDEOS_PER_CHANNEL = 5;

interface YoutubeChannelListResponse {
  items?: { id: string; contentDetails: { relatedPlaylists: { uploads: string } } }[];
}

interface YoutubePlaylistItemsResponse {
  items?: {
    snippet: { title: string; publishedAt: string; resourceId: { videoId: string } };
  }[];
}

interface YoutubeCommentThreadsResponse {
  items?: {
    id: string;
    snippet: {
      topLevelComment: {
        snippet: {
          textDisplay: string;
          authorDisplayName: string;
          likeCount: number;
          publishedAt: string;
        };
      };
    };
  }[];
}

function apiKey(): string | null {
  return process.env.YOUTUBE_API_KEY ?? null;
}

async function fetchJson<T>(url: string): Promise<T | null> {
  const res = await fetch(url);
  if (!res.ok) {
    console.warn(`[youtube] fetch failed (${url.split("?")[0]}): ${res.status}`);
    return null;
  }
  return (await res.json()) as T;
}

/**
 * Resolves a channel handle to its uploads-playlist id. Costs 1 quota unit.
 * `playlistItems.list` against the uploads playlist is 1 unit vs.
 * `search.list`'s 100 units for the equivalent "recent videos" query.
 */
async function resolveUploadsPlaylistId(handle: string, key: string): Promise<string | null> {
  const data = await fetchJson<YoutubeChannelListResponse>(
    `https://www.googleapis.com/youtube/v3/channels?part=contentDetails&forHandle=${encodeURIComponent(handle)}&key=${key}`,
  );
  return data?.items?.[0]?.contentDetails.relatedPlaylists.uploads ?? null;
}

interface VideoComments {
  videoId: string;
  videoTitle: string;
  comments: YoutubeCommentThreadsResponse["items"];
}

async function fetchCommentThreads(videoId: string, videoTitle: string, key: string): Promise<VideoComments> {
  const data = await fetchJson<YoutubeCommentThreadsResponse>(
    `https://www.googleapis.com/youtube/v3/commentThreads?part=snippet&videoId=${videoId}&maxResults=50&order=relevance&key=${key}`,
  );
  return { videoId, videoTitle, comments: data?.items ?? [] };
}

/**
 * YouTube comments poller (poller-expansion-spec.md Source 1) — curated
 * dev-channel list, top-level comment threads on each channel's recent
 * uploads. No-ops (matching pollReddit's convention) when YOUTUBE_API_KEY
 * isn't configured, so the other pollers keep working without it.
 *
 * Quota accounting: `channels.list` (resolve handle) + `playlistItems.list`
 * (recent videos) + `commentThreads.list` per video each cost 1 unit, so a
 * run over N channels with up to MAX_VIDEOS_PER_CHANNEL videos each costs
 * roughly N * (2 + MAX_VIDEOS_PER_CHANNEL) units — logged below, with a
 * warning if projected usage nears the 10,000/day free-tier cap.
 */
export async function pollYoutubeComments(): Promise<PollResult> {
  const key = apiKey();
  if (!key) return { signals: [], noiseFiltered: 0 };

  const projectedUnits = YOUTUBE_CHANNEL_HANDLES.length * (2 + MAX_VIDEOS_PER_CHANNEL);
  console.log(`[youtube] projected quota usage this run: ~${projectedUnits} units`);
  if (projectedUnits > YOUTUBE_QUOTA_WARN_THRESHOLD) {
    console.warn(
      `[youtube] projected usage (${projectedUnits}) exceeds warn threshold (${YOUTUBE_QUOTA_WARN_THRESHOLD}) — trim YOUTUBE_CHANNEL_HANDLES or MAX_VIDEOS_PER_CHANNEL`,
    );
  }

  const signals: RawSignalInput[] = [];

  for (const handle of YOUTUBE_CHANNEL_HANDLES) {
    const uploadsPlaylistId = await resolveUploadsPlaylistId(handle, key);
    if (!uploadsPlaylistId) {
      console.warn(`[youtube] could not resolve channel handle ${handle}`);
      continue;
    }

    const videos = await fetchJson<YoutubePlaylistItemsResponse>(
      `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&playlistId=${uploadsPlaylistId}&maxResults=${MAX_VIDEOS_PER_CHANNEL}&key=${key}`,
    );
    const since = Date.now() - VIDEO_LOOKBACK_DAYS * 24 * 60 * 60 * 1000;
    const recentVideos = (videos?.items ?? []).filter((item) => new Date(item.snippet.publishedAt).getTime() >= since);

    const videoComments = await Promise.all(
      recentVideos.map((v) => fetchCommentThreads(v.snippet.resourceId.videoId, v.snippet.title, key)),
    );

    for (const { videoId, videoTitle, comments } of videoComments) {
      for (const thread of comments ?? []) {
        const comment = thread.snippet.topLevelComment.snippet;
        if (comment.textDisplay.trim().length < MIN_COMMENT_LENGTH) continue;

        signals.push({
          source: "youtube",
          url: `https://youtube.com/watch?v=${videoId}&lc=${thread.id}`,
          title: videoTitle,
          text: comment.textDisplay,
          author: comment.authorDisplayName,
          engagementMetric: comment.likeCount,
          postedAt: comment.publishedAt,
        });
      }
    }
  }

  const { kept, noiseFiltered } = applyNoiseFilters("youtube", signals);
  return { signals: kept, noiseFiltered };
}
