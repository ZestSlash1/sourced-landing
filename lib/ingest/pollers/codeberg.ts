import { applyNoiseFilters } from "../noise-filters";
import type { PollResult, RawSignalInput } from "../types";

// Codeberg's dataset is much smaller than GitHub/GitLab's, so this discovers
// active repos via the search API (sorted by recent activity) rather than a
// hand-curated list — no reliable way to pre-verify which orgs are actually
// hosted on Codeberg vs. mirrored elsewhere. Included for source diversity,
// not as a primary volume driver (poller-expansion-spec.md Source 2 Note).
const REPO_SEARCH_PAGE_SIZE = 25;
const MIN_STARS = 3;
const MAX_REPOS_TO_SCAN = 25;
const ISSUES_PER_REPO = 30;

interface CodebergRepo {
  full_name: string;
  stars_count: number;
}

interface CodebergRepoSearchResponse {
  data: CodebergRepo[];
}

interface CodebergIssue {
  id: number;
  html_url: string;
  title: string;
  body: string | null;
  user: { login: string } | null;
  comments: number;
  created_at: string;
  pull_request?: unknown; // present when the issues endpoint also returns PRs
}

async function discoverActiveRepos(): Promise<string[]> {
  // sort=updated surfaces tiny personal repos (frequently pushed, near-zero
  // stars) far more often than active projects worth mining for issues —
  // sort=stars is what actually yields repos with real issue-tracker
  // activity (verified against the live API before landing this).
  const res = await fetch(
    `https://codeberg.org/api/v1/repos/search?sort=stars&order=desc&limit=${REPO_SEARCH_PAGE_SIZE}`,
  );
  if (!res.ok) {
    console.warn(`[codeberg] repo search failed: ${res.status}`);
    return [];
  }
  const data = (await res.json()) as CodebergRepoSearchResponse;
  return (data.data ?? [])
    .filter((r) => r.stars_count >= MIN_STARS)
    .slice(0, MAX_REPOS_TO_SCAN)
    .map((r) => r.full_name);
}

/**
 * Codeberg Issues poller (poller-expansion-spec.md Source 2) — Forgejo's
 * Gitea-compatible REST API, fully keyless for public repos at this volume.
 * Discovers recently-active repos, then pulls open issues (not PRs) from
 * each, structurally mirroring the GitHub/GitLab issue pollers.
 */
export async function pollCodeberg(): Promise<PollResult> {
  const repos = await discoverActiveRepos();

  const responses = await Promise.all(
    repos.map((repo) =>
      fetch(
        `https://codeberg.org/api/v1/repos/${repo}/issues?state=open&type=issues&sort=created&limit=${ISSUES_PER_REPO}`,
      ).then(async (res) => {
        if (!res.ok) {
          console.warn(`[codeberg] fetch failed (${repo}): ${res.status}`);
          return [] as CodebergIssue[];
        }
        return res.json() as Promise<CodebergIssue[]>;
      }),
    ),
  );

  const signals: RawSignalInput[] = [];

  for (const issues of responses) {
    for (const issue of issues) {
      if (issue.pull_request) continue; // belt-and-suspenders even with type=issues

      signals.push({
        source: "codeberg",
        url: issue.html_url,
        title: issue.title,
        text: issue.body ?? issue.title,
        author: issue.user?.login ?? null,
        engagementMetric: issue.comments,
        postedAt: issue.created_at,
      });
    }
  }

  const { kept, noiseFiltered } = applyNoiseFilters("codeberg", signals);
  return { signals: kept, noiseFiltered };
}
