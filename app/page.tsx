import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/auth/current-user";
import { getMethodologyStats, getNearestPassingClusters } from "@/lib/ingest/pipeline-stats";
import { listRecentPipelineRuns } from "@/lib/ingest/pipeline-runs-repository";
import { MIN_CLUSTER_SIZE } from "@/lib/ingest/clustering";
import type { ProofBarData } from "./proof-bar";
import HomeClient from "./home-client";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

export default async function Home() {
  const [user, stats, nearMiss, latestRuns] = await Promise.all([
    getCurrentUser(),
    getMethodologyStats(),
    getNearestPassingClusters(3),
    listRecentPipelineRuns(1),
  ]);

  const proofBar: ProofBarData = {
    signalsTracked: stats.signalsIngested,
    clustersEvaluated: stats.clustersFormed,
    clustersPassedThisRun: latestRuns[0]?.clustersPassingBar ?? stats.clustersPassingBar,
    minClusterSize: MIN_CLUSTER_SIZE,
    nearMiss,
  };

  return <HomeClient userEmail={user?.email ?? null} proofBar={proofBar} />;
}
