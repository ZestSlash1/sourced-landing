import type { RawComplaint } from "../types";

/**
 * TODO: requires Upwork API credentials (OAuth2 app + approved API access —
 * https://developers.upwork.com/). Not wired up in this phase; use
 * parseUpworkPastedJobs as a manual fallback until credentials exist.
 */
export async function fetchUpworkJobs(_query: string): Promise<RawComplaint[]> {
  throw new Error(
    "Upwork connector requires API credentials (UPWORK_CLIENT_ID / UPWORK_CLIENT_SECRET) " +
      "which are not configured. Use parseUpworkPastedJobs for a manual-paste fallback."
  );
}

interface PastedUpworkJob {
  title: string;
  description: string;
  url: string;
  postedAt: string;
  budgetUsd?: number;
}

/** Manual fallback: paste job postings copied from Upwork's own site. */
export function parseUpworkPastedJobs(jobs: PastedUpworkJob[]): RawComplaint[] {
  return jobs.map((job) => ({
    platform: "upwork",
    rawText: `${job.title}\n\n${job.description}`,
    url: job.url,
    date: job.postedAt,
    engagementRaw:
      job.budgetUsd !== undefined ? { type: "budget_usd", value: job.budgetUsd } : undefined,
  }));
}
