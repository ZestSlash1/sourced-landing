import "server-only";
import { upsertIdeaDrop } from "@/lib/idea-drops/repository";
import { clusterSignals } from "./clustering";
import { draftIdeaFromCluster } from "./claude-draft";
import { DAILY_DRAFT_CAP, draftsCreatedToday } from "./daily-cap";
import { listUndraftedSignals, markSignalsDrafted } from "./raw-signals-repository";

export interface DraftPassResult {
  clustersFound: number;
  drafted: number;
  skippedAtCap: boolean;
  errors: string[];
}

/**
 * The A2->A3 pipeline: cluster whatever's undrafted, draft up to whatever's
 * left of today's cap (Decision #3), write each as a pending_review idea,
 * and mark its source signals consumed so they're never redrafted.
 *
 * One cluster failing (a bad Claude response, a rate limit) doesn't stop
 * the rest — errors are collected and returned, not thrown, so a single
 * flaky call doesn't block the whole cron run.
 */
export async function runDraftPass(): Promise<DraftPassResult> {
  const [signals, alreadyToday] = await Promise.all([listUndraftedSignals(), draftsCreatedToday()]);
  const clusters = clusterSignals(signals);

  const remaining = Math.max(0, DAILY_DRAFT_CAP - alreadyToday);
  const errors: string[] = [];
  let drafted = 0;

  for (const cluster of clusters.slice(0, remaining)) {
    try {
      const idea = await draftIdeaFromCluster(cluster);
      const saved = await upsertIdeaDrop(idea);
      await markSignalsDrafted(
        cluster.signals.map((s) => s.id),
        saved.id,
      );
      drafted++;
    } catch (err) {
      errors.push(err instanceof Error ? err.message : String(err));
    }
  }

  return {
    clustersFound: clusters.length,
    drafted,
    skippedAtCap: remaining === 0 && clusters.length > 0,
    errors,
  };
}
