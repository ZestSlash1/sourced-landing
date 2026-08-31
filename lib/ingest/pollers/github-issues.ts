import { applyNoiseFilters } from "../noise-filters";
import type { PollResult, RawSignalInput } from "../types";

// Curated high-signal OSS repos where real developer/SaaS-adjacent
// complaints and unmet needs surface. Skewed toward developer
// infrastructure and app-building tools whose users are also SaaS buyers.
const REPOS = [
  "vercel/next.js",
  "supabase/supabase",
  "prisma/prisma",
  "tailwindlabs/tailwindcss",
  "vitejs/vite",
  "remix-run/remix",
  "sveltejs/kit",
  "expo/expo",
  "langchain-ai/langchainjs",
  "shadcn-ui/ui",
  "trpc/trpc",
  "TanStack/query",
  "drizzle-team/drizzle-orm",
  "clerk/javascript",
  "resend/resend-node",
  "stripe/stripe-node",
  "shopify/shopify-api-js",
  "strapi/strapi",
  "n8n-io/n8n",
  "PostHog/posthog",
  "calcom/cal.com",
  "appwrite/appwrite",
];

// Complaint-shaped phrases searched across ALL public repos (not just the
// curated list above) via GitHub's Search API, to widen volume beyond
// hand-picked OSS projects. Scoped to open issues from the last 90 days.
const PAIN_PHRASE_QUERIES = [
  `"I wish" in:body`,
  `"is there a way to" in:body`,
  `"frustrating" in:body`,
  `"workaround for" in:body`,
  `"no easy way to" in:body`,
];
const SEARCH_LOOKBACK_DAYS = 90;

const MIN_REACTIONS = 2;
const FEATURE_REQUEST_LABELS = new Set([
  "feature",
  "enhancement",
  "feature request",
  "feature-request",
  "type: feature",
  "type: enhancement",
  "type/feature",
  "type/enhancement",
  "kind/feature",
  "kind/enhancement",
  "kind: feature",
  "kind: enhancement",
]);

interface GithubIssue {
  id: number;
  html_url: string;
  title: string;
  body: string | null;
  user: { login: string } | null;
  reactions: { total_count: number };
  comments: number;
  created_at: string;
  labels: (string | { name: string })[];
  pull_request?: unknown; // present on PRs; GitHub's issues endpoint returns both
}

interface GithubSearchResponse {
  items: GithubIssue[];
}

function authHeaders(): HeadersInit {
  const token = process.env.GITHUB_TOKEN;
  return token ? { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json" } : { Accept: "application/vnd.github+json" };
}

function logAuthMode(): void {
  const mode = process.env.GITHUB_TOKEN ? "authenticated (5,000 req/hr)" : "unauthenticated (60 req/hr, shared per IP)";
  console.log(`[github-issues] running in ${mode} mode`);
}

function searchDateFilter(): string {
  const since = new Date(Date.now() - SEARCH_LOOKBACK_DAYS * 24 * 60 * 60 * 1000);
  return since.toISOString().slice(0, 10);
}

/**
 * Search API leg (Part 1b) — matches complaint-shaped phrases across ALL
 * public repos, not just the curated list. The Search API has its own
 * stricter rate limit (10 req/min unauthenticated, 30/min with a token),
 * separate from the core REST limit used by the curated-repo fetches above.
 */
async function searchGithubIssues(): Promise<GithubIssue[]> {
  const since = searchDateFilter();
  const results = await Promise.all(
    PAIN_PHRASE_QUERIES.map((phrase) =>
      fetch(
        `https://api.github.com/search/issues?q=${encodeURIComponent(`${phrase} is:issue is:open created:>=${since}`)}&sort=reactions&order=desc&per_page=30`,
        { headers: authHeaders() },
      ).then(async (res) => {
        if (!res.ok) {
          console.warn(`[github-issues] search fetch failed (${phrase}): ${res.status}`);
          return [] as GithubIssue[];
        }
        const data = (await res.json()) as GithubSearchResponse;
        return data.items ?? [];
      }),
    ),
  );
  return results.flat();
}

/**
 * GitHub Issues poller — two legs merged and deduped by issue id:
 * (1) the original curated repo list, filtered to feature-request labels;
 * (2) Part 1b's Search API leg, matching complaint-shaped phrases across
 * all public repos. Works unauthenticated, but both the core REST limit
 * (60/hr) and the separate Search rate limit (10/min) are far tighter
 * without GITHUB_TOKEN set — recommended now that this polls much more.
 */
export async function pollGithubIssues(): Promise<PollResult> {
  logAuthMode();
  const [curatedResponses, searchIssues] = await Promise.all([
    Promise.all(
      REPOS.map((repo) =>
        fetch(
          `https://api.github.com/repos/${repo}/issues?state=open&sort=comments&direction=desc&per_page=40`,
          { headers: authHeaders() },
        ).then(async (res) => {
          if (!res.ok) {
            console.warn(`[github-issues] fetch failed (${repo}): ${res.status}`);
            return [] as GithubIssue[];
          }
          return res.json() as Promise<GithubIssue[]>;
        }),
      ),
    ),
    searchGithubIssues(),
  ]);

  const seen = new Set<number>();
  const signals: RawSignalInput[] = [];

  const pushSignal = (issue: GithubIssue) => {
    signals.push({
      source: "github",
      url: issue.html_url,
      title: issue.title,
      text: issue.body ?? issue.title,
      author: issue.user?.login ?? null,
      engagementMetric: issue.reactions.total_count + issue.comments,
      postedAt: issue.created_at,
    });
  };

  for (const issues of curatedResponses) {
    for (const issue of issues) {
      if (issue.pull_request) continue; // PRs show up in this endpoint too
      if (seen.has(issue.id)) continue;

      const labelNames = issue.labels.map((l) => (typeof l === "string" ? l : l.name).toLowerCase());
      const isFeatureRequest = labelNames.some((l) => FEATURE_REQUEST_LABELS.has(l));
      if (!isFeatureRequest) continue;
      if (issue.reactions.total_count < MIN_REACTIONS) continue;

      seen.add(issue.id);
      pushSignal(issue);
    }
  }

  // Search-API leg is phrase-gated rather than label-gated — a complaint
  // caught by wording ("I wish", "frustrating", ...) is signal on its own,
  // even without a maintainer having triaged it as "feature request" yet.
  for (const issue of searchIssues) {
    if (issue.pull_request) continue;
    if (seen.has(issue.id)) continue;
    if (issue.reactions.total_count < MIN_REACTIONS) continue;

    seen.add(issue.id);
    pushSignal(issue);
  }

  const { kept, noiseFiltered } = applyNoiseFilters("github", signals);
  return { signals: kept, noiseFiltered };
}
