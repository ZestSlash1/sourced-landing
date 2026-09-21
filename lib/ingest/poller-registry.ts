import "server-only";
import { pollHackerNews } from "./pollers/hacker-news";
import { pollStackExchange } from "./pollers/stack-exchange";
import { pollGithubIssues } from "./pollers/github-issues";
import { pollDevTo } from "./pollers/devto";
import { pollLobsters } from "./pollers/lobsters";
import { pollGitlabIssues } from "./pollers/gitlab-issues";
import { pollYoutubeComments } from "./pollers/youtube";
import { pollCodeberg } from "./pollers/codeberg";
import { pollDiscourse } from "./pollers/discourse";
import { pollMastodon } from "./pollers/mastodon";
import { pollBluesky } from "./pollers/bluesky";
import { pollDevRant } from "./pollers/devrant";
import { pollAppStoreReviews } from "./pollers/app-store";
import { insertRawSignals } from "./raw-signals-repository";
import type { PollerId } from "./poller-ids";
import type { PollResult } from "./types";

/**
 * Every live poller, keyed by a stable id. Reddit is intentionally absent
 * (permanently ruled out — see CLAUDE.md). Used by the admin pipeline banner
 * so the browser can trigger one source per request instead of one
 * long-running request for all of them.
 */
const POLLERS: Record<PollerId, { run: () => Promise<PollResult> }> = {
  hackernews: { run: pollHackerNews },
  stackexchange: { run: pollStackExchange },
  github: { run: pollGithubIssues },
  devto: { run: pollDevTo },
  lobsters: { run: pollLobsters },
  gitlab: { run: pollGitlabIssues },
  youtube: { run: pollYoutubeComments },
  codeberg: { run: pollCodeberg },
  discourse: { run: pollDiscourse },
  mastodon: { run: pollMastodon },
  bluesky: { run: pollBluesky },
  devrant: { run: pollDevRant },
  appstore: { run: () => pollAppStoreReviews() },
};

export function isPollerId(value: unknown): value is PollerId {
  return typeof value === "string" && Object.prototype.hasOwnProperty.call(POLLERS, value);
}

export interface PollerRunResult {
  fetched: number;
  noiseFiltered: number;
  inserted: number;
}

export async function runPoller(id: PollerId): Promise<PollerRunResult> {
  const { signals, noiseFiltered } = await POLLERS[id].run();
  const inserted = await insertRawSignals(signals);
  return { fetched: signals.length, noiseFiltered, inserted };
}
