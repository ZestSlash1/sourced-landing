import type { RawSignalInput } from "../types";

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

function authHeaders(): HeadersInit {
  const token = process.env.GITHUB_TOKEN;
  return token ? { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json" } : { Accept: "application/vnd.github+json" };
}

/**
 * GitHub Issues poller (Part A1) — REST API against a curated repo list,
 * sorted by comment count (a decent engagement proxy since the /issues
 * endpoint doesn't support sort=reactions), filtered to feature-request
 * labels with at least a couple of 👍 reactions. Works unauthenticated
 * (60 req/hr), but set GITHUB_TOKEN for headroom.
 */
export async function pollGithubIssues(): Promise<RawSignalInput[]> {
  const responses = await Promise.all(
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
  );

  const signals: RawSignalInput[] = [];

  for (const issues of responses) {
    for (const issue of issues) {
      if (issue.pull_request) continue; // PRs show up in this endpoint too

      const labelNames = issue.labels.map((l) => (typeof l === "string" ? l : l.name).toLowerCase());
      const isFeatureRequest = labelNames.some((l) => FEATURE_REQUEST_LABELS.has(l));
      if (!isFeatureRequest) continue;
      if (issue.reactions.total_count < MIN_REACTIONS) continue;

      signals.push({
        source: "github",
        url: issue.html_url,
        title: issue.title,
        text: issue.body ?? issue.title,
        author: issue.user?.login ?? null,
        engagementMetric: issue.reactions.total_count + issue.comments,
        postedAt: issue.created_at,
      });
    }
  }

  return signals;
}
