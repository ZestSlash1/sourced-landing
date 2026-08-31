import type { RawSignalInput, SignalSource } from "./types";

// Too short to contain an articulable problem, regardless of source.
export const MIN_BODY_LENGTH = 120;

// Dev.to recurring community-column titles (sourced-pipeline-quality-spec.md
// Part 1) — these are conversation prompts, not complaints, and can never
// cluster into an unmet need. Configurable list rather than hardcoded checks
// since Dev.to adds/retires these columns over time.
export const DEVTO_NOISE_TITLE_PATTERNS: RegExp[] = [
  /what was your win this week/i,
  /meme monday/i,
  /welcome thread/i,
  /weekly retro/i,
  /what are you working on/i,
];

// GitLab templated rollout/housekeeping tickets — feature-flag rollout
// checklists follow a fixed title shape across the whole instance and are
// never a genuine unmet-need signal.
export const GITLAB_NOISE_TITLE_PATTERNS: RegExp[] = [/^\[feature flag]/i, /^enable\s/i, /^roll out\s/i];

// GitLab authors that are clearly automation, not a person describing a
// problem. Heuristic, not a curated list — GitLab doesn't expose a "is bot"
// flag on the public issues endpoint.
const GITLAB_BOT_AUTHOR_PATTERN = /(^|[-_])bot($|[-_])|\[bot]$/i;

function isDevToNoise(title: string): boolean {
  return DEVTO_NOISE_TITLE_PATTERNS.some((p) => p.test(title));
}

function isGitlabNoise(title: string, author: string | null): boolean {
  if (author && GITLAB_BOT_AUTHOR_PATTERN.test(author)) return true;
  return GITLAB_NOISE_TITLE_PATTERNS.some((p) => p.test(title));
}

/**
 * Part 1 noise filters — applied per poller, before insert. Drops items that
 * will never be genuine signal regardless of downstream classification, so
 * they never consume embedding/classification spend. Returns the surviving
 * signals plus how many were dropped, for observability (Part 3).
 */
export function applyNoiseFilters(source: SignalSource, signals: RawSignalInput[]): { kept: RawSignalInput[]; noiseFiltered: number } {
  let noiseFiltered = 0;
  const kept = signals.filter((s) => {
    if (s.text.trim().length < MIN_BODY_LENGTH) {
      noiseFiltered++;
      return false;
    }
    const title = s.title ?? "";
    if (source === "devto" && isDevToNoise(title)) {
      noiseFiltered++;
      return false;
    }
    if (source === "gitlab" && isGitlabNoise(title, s.author)) {
      noiseFiltered++;
      return false;
    }
    return true;
  });
  return { kept, noiseFiltered };
}
