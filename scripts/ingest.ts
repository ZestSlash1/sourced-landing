import { pathToFileURL } from "node:url";
import { fetchRedditComplaints } from "../lib/ingest/sources/reddit";
import { toEvidence } from "../lib/ingest/to-evidence";
import { clusterEvidence } from "../lib/ingest/cluster-evidence";
import { upsertIdea } from "../lib/idea-drops/store";
import type { IdeaDrop } from "../types/idea-drop";

/**
 * Ingest entry point (sourced-phase2-spec.md Task 1.4). Run manually or via
 * cron: `tsx scripts/ingest.ts r/SaaS r/bookkeeping`.
 *
 * Follows the same script pattern as scripts/sync-public-apis.ts (this repo
 * has no admin-triggered route infra yet — the existing ingest-adjacent
 * pipeline, public-apis sync, is a script + GitHub Action, so this matches
 * that rather than inventing a new pattern).
 */
function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

function draftIdeaFromCluster(cluster: IdeaDrop["evidence"], index: number): IdeaDrop {
  const today = new Date().toISOString().slice(0, 10);
  const seedQuote = cluster[0]?.quote ?? "Untitled";
  return {
    id: `sourced-${today}-${String(index + 1).padStart(3, "0")}`,
    slug: slugify(seedQuote) || `draft-${index + 1}`,
    title: `Draft: ${seedQuote}`,
    category: "",
    demandScore: 0,
    tags: [],
    publishedAt: new Date().toISOString(),
    tier: "free",
    problem: { summary: "", whoFeelsIt: "" },
    evidence: cluster,
    whyNow: "",
    buildBrief: { coreLoop: [], mvpScope: [], explicitlyCut: [], dataModel: [] },
    matchedApis: [],
    launchStack: [],
    agentPrompts: { claudeCode: "", cursorWindsurf: "", v0Bolt: "" },
    difficulty: { soloWeekendProject: false, estimatedHours: 0, skillFloor: "beginner" },
    status: "draft",
  };
}

export async function runIngest(subreddits: string[]): Promise<IdeaDrop[]> {
  const rawComplaints = (
    await Promise.all(subreddits.map((sub) => fetchRedditComplaints(sub)))
  ).flat();

  const evidenceResults = await Promise.all(rawComplaints.map((raw) => toEvidence(raw)));
  const evidence = evidenceResults.filter((e): e is NonNullable<typeof e> => e !== null);

  const clusters = await clusterEvidence(evidence);

  const drafts = clusters.map((cluster, i) => draftIdeaFromCluster(cluster, i));

  for (const draft of drafts) {
    await upsertIdea(draft);
  }

  return drafts;
}

async function main() {
  const subreddits = process.argv.slice(2).map((s) => s.replace(/^r\//, ""));
  if (subreddits.length === 0) {
    console.error("Usage: tsx scripts/ingest.ts <subreddit> [<subreddit> ...]");
    process.exitCode = 1;
    return;
  }

  try {
    const drafts = await runIngest(subreddits);
    console.log(
      `Wrote ${drafts.length} draft idea(s) from r/${subreddits.join(", r/")} to data/idea-drops.json`
    );
  } catch (error) {
    console.error("Ingest failed:", error instanceof Error ? error.message : error);
    process.exitCode = 1;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  void main();
}
