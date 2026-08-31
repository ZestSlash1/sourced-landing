import { applyNoiseFilters } from "../noise-filters";
import type { PollResult, RawSignalInput } from "../types";

// GitLab's global /api/v4/issues endpoint requires auth (it's scoped to the
// authenticated user), so unlike GitHub there's no keyless cross-repo search.
// Falls back to the per-project endpoint (works for public projects without
// a token) against a curated list of active, primarily-GitLab-hosted
// projects — verified against the live API before being added here.
const PROJECTS = [
  "gitlab-org/gitlab",
  "gitlab-org/gitlab-runner",
  "gitlab-org/omnibus-gitlab",
  "gitlab-org/gitaly",
  "inkscape/inkscape",
  "fdroid/fdroidclient",
  "veloren/veloren",
  "wireshark/wireshark",
];

const MIN_UPVOTES = 0;
const FEATURE_REQUEST_LABELS = new Set([
  "feature",
  "feature request",
  "feature::addition",
  "type::feature",
  "type::feature request",
  "enhancement",
]);

interface GitlabIssue {
  id: number;
  iid: number;
  web_url: string;
  title: string;
  description: string | null;
  author: { username: string } | null;
  upvotes: number;
  user_notes_count: number;
  created_at: string;
  labels: string[];
}

function authHeaders(): HeadersInit {
  const token = process.env.GITLAB_TOKEN;
  return token ? { "PRIVATE-TOKEN": token } : {};
}

/**
 * GitLab Issues poller (Part 2a) — structurally identical to the GitHub
 * curated-repo leg, reusing the same feature-request-label + engagement
 * gating. No global keyless search exists on GitLab (see PROJECTS comment),
 * so this stays repo-scoped unless GITLAB_TOKEN is added later to unlock
 * `scope=all` on the global endpoint.
 */
export async function pollGitlabIssues(): Promise<PollResult> {
  const responses = await Promise.all(
    PROJECTS.map((project) =>
      fetch(
        `https://gitlab.com/api/v4/projects/${encodeURIComponent(project)}/issues?state=opened&order_by=created_at&sort=desc&per_page=40`,
        { headers: authHeaders() },
      ).then(async (res) => {
        if (!res.ok) {
          console.warn(`[gitlab-issues] fetch failed (${project}): ${res.status}`);
          return [] as GitlabIssue[];
        }
        return res.json() as Promise<GitlabIssue[]>;
      }),
    ),
  );

  const signals: RawSignalInput[] = [];

  for (const issues of responses) {
    for (const issue of issues) {
      const labelNames = issue.labels.map((l) => l.toLowerCase());
      const isFeatureRequest = labelNames.some((l) => FEATURE_REQUEST_LABELS.has(l));
      if (!isFeatureRequest) continue;
      if (issue.upvotes < MIN_UPVOTES) continue;

      signals.push({
        source: "gitlab",
        url: issue.web_url,
        title: issue.title,
        text: issue.description ?? issue.title,
        author: issue.author?.username ?? null,
        engagementMetric: issue.upvotes + issue.user_notes_count,
        postedAt: issue.created_at,
      });
    }
  }

  // Note: if this drops GitLab to near-zero usable signal, that's a
  // legitimate finding to flag (sourced-pipeline-quality-spec.md Part 1) —
  // do not loosen the filter just to keep the volume number up.
  const { kept, noiseFiltered } = applyNoiseFilters("gitlab", signals);
  return { signals: kept, noiseFiltered };
}
