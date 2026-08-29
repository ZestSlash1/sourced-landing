import type { RawSignalInput } from "../types";

// Curated popular OSS repos across Sourced's existing topic categories.
// Expand this list as topics expand (lib/topics.ts).
const REPOS = [
  "vercel/next.js",
  "supabase/supabase",
  "shopify/shopify-api-js",
  "stripe/stripe-node",
  "strapi/strapi",
];

const MIN_REACTIONS = 5;
const FEATURE_REQUEST_LABELS = ["feature", "enhancement", "feature request"];

interface GithubIssue {
  id: number;
  html_url: string;
  title: string;
  body: string | null;
  user: { login: string } | null;
  reactions: { total_count: number };
  created_at: string;
  labels: (string | { name: string })[];
  pull_request?: unknown; // present on PRs; GitHub's issues endpoint returns both
}

function authHeaders(): HeadersInit {
  const token = process.env.GITHUB_TOKEN;
  return token ? { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json" } : { Accept: "application/vnd.github+json" };
}

/**
 * GitHub Issues poller (Part A1) — REST API against a curated repo list,
 * filtered to feature-request-labeled issues with meaningful 👍 reactions.
 * Works unauthenticated (60 req/hr), but set GITHUB_TOKEN for headroom.
 */
export async function pollGithubIssues(): Promise<RawSignalInput[]> {
  const responses = await Promise.all(
    REPOS.map((repo) =>
      fetch(
        `https://api.github.com/repos/${repo}/issues?state=open&sort=created&direction=desc&per_page=30`,
        { headers: authHeaders() },
      ).then((res) => {
        if (!res.ok) throw new Error(`GitHub issues fetch failed (${repo}): ${res.status}`);
        return res.json() as Promise<GithubIssue[]>;
      }),
    ),
  );

  const signals: RawSignalInput[] = [];

  for (const issues of responses) {
    for (const issue of issues) {
      if (issue.pull_request) continue; // PRs show up in this endpoint too

      const labelNames = issue.labels.map((l) => (typeof l === "string" ? l : l.name.toLowerCase()));
      const isFeatureRequest = labelNames.some((l) => FEATURE_REQUEST_LABELS.includes(l));
      if (!isFeatureRequest) continue;
      if (issue.reactions.total_count < MIN_REACTIONS) continue;

      signals.push({
        source: "github",
        url: issue.html_url,
        title: issue.title,
        text: issue.body ?? issue.title,
        author: issue.user?.login ?? null,
        engagementMetric: issue.reactions.total_count,
        postedAt: issue.created_at,
      });
    }
  }

  return signals;
}
