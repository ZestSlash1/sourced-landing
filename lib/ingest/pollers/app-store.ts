import { applyNoiseFilters } from "../noise-filters";
import {
  APPLE_APP_STORE_TARGETS,
  APP_STORE_MAX_RATING,
  APP_STORE_REQUEST_DELAY_MS,
  APP_STORE_USER_AGENT,
  type AppStoreTarget,
} from "../poller-sources";
import type { PollResult, RawSignalInput } from "../types";

interface AppleReviewEntry {
  id?: { label?: string };
  title?: { label?: string };
  content?: { label?: string };
  "im:rating"?: { label?: string };
  author?: { name?: { label?: string } };
  updated?: { label?: string };
  link?: { attributes?: { href?: string } };
}

interface AppleReviewFeedResponse {
  feed?: {
    entry?: AppleReviewEntry[];
  };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchAppStoreReviews(target: AppStoreTarget): Promise<AppleReviewEntry[]> {
  const country = target.country ?? "us";
  const url = `https://itunes.apple.com/${country}/rss/customerreviews/id=${target.id}/sortBy=mostRecent/page=1/json`;

  try {
    const res = await fetch(url, { headers: { "User-Agent": APP_STORE_USER_AGENT } });
    if (!res.ok) {
      console.warn(`[appstore] fetch failed for ${target.name} (${target.id}): ${res.status}`);
      return [];
    }
    const data = (await res.json()) as AppleReviewFeedResponse;
    const entries = data.feed?.entry ?? [];
    // The first entry in Apple's RSS feed is app metadata, not a customer review.
    return entries.slice(1);
  } catch (err) {
    console.warn(`[appstore] request error for ${target.name}:`, err instanceof Error ? err.message : err);
    return [];
  }
}

/**
 * Apple App Store customer review poller.
 * Ingests 1★ and 2★ negative reviews for curated B2B, developer, and freelance mobile SaaS tools.
 * Uses official, keyless, zero-auth RSS feeds from Apple.
 */
export async function pollAppStoreReviews(
  targets: AppStoreTarget[] = APPLE_APP_STORE_TARGETS,
): Promise<PollResult> {
  const signals: RawSignalInput[] = [];

  for (const target of targets) {
    const reviews = await fetchAppStoreReviews(target);
    await sleep(APP_STORE_REQUEST_DELAY_MS);

    for (const review of reviews) {
      const ratingStr = review["im:rating"]?.label;
      const rating = ratingStr ? Number.parseInt(ratingStr, 10) : 5;

      // Only retain 1-star and 2-star reviews (concentrated complaints)
      if (Number.isNaN(rating) || rating > APP_STORE_MAX_RATING) continue;

      const reviewTitle = review.title?.label?.trim() ?? "";
      const reviewBody = review.content?.label?.trim() ?? "";
      if (!reviewBody) continue;

      const reviewId = review.id?.label ?? Math.random().toString(36).slice(2);
      const rawUrl = review.link?.attributes?.href ?? `https://apps.apple.com/app/id${target.id}`;
      const baseUrl = rawUrl.split("#")[0];
      const url = `${baseUrl}#review-${reviewId}`;

      // Inverted rating: 1-star review receives engagement metric 4, 2-star receives 3
      const engagementMetric = Math.max(1, 5 - rating);

      signals.push({
        source: "appstore",
        url,
        title: `${target.name}: ${reviewTitle || "App Review"}`,
        text: reviewBody,
        author: review.author?.name?.label ?? null,
        engagementMetric,
        postedAt: review.updated?.label ?? new Date().toISOString(),
      });
    }
  }

  const { kept, noiseFiltered } = applyNoiseFilters("appstore", signals);
  return { signals: kept, noiseFiltered };
}
