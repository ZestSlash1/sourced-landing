import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/auth/current-user";
import { getMethodologyStats, getNearestPassingClusters } from "@/lib/ingest/pipeline-stats";
import { listRecentPipelineRuns } from "@/lib/ingest/pipeline-runs-repository";
import { MIN_CLUSTER_SIZE } from "@/lib/ingest/clustering";
import { listFeaturedIdeas, listPublishedIdeas, getPublishedIdeaByIdOrSlug } from "@/lib/idea-drops/repository";
import type { ProofBarData } from "./proof-bar";
import HomeClient from "./home-client";

/**
 * Mirrors the FAQ copy rendered in home-client.tsx's `.faq-list` — kept in
 * sync by hand since that section is a client component and this JSON-LD
 * needs to match what's actually on the page, not just sound plausible.
 */
const FAQ_ITEMS = [
  {
    question: "Where do the matched APIs come from?",
    answer:
      "From a structured, regularly-synced copy of the public-apis directory, a 470k-star, MIT-licensed community list. We match categories to your idea's build brief; full docs links and rate limits ship on Builder and above.",
  },
  {
    question: "Which coding tool does this work with?",
    answer:
      "Any AI-assisted builder: Claude Code, Cursor, Windsurf, v0, Bolt, and more. Pick yours in the hero above and every build brief formats for it automatically.",
  },
  {
    question: "Is this just ChatGPT with extra steps?",
    answer:
      "No. Every card starts from a real, sourced complaint, not a generated headline. You can see the source signal behind each idea, not just the pitch.",
  },
  {
    question: "What if I build one and it doesn't work?",
    answer:
      "Some won't. That's true of every idea anywhere. Sourced removes the guessing on whether anyone wants it in the first place; the execution risk is still yours, same as any build.",
  },
];

function HomeFaqJsonLd() {
  const json = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQ_ITEMS.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: { "@type": "Answer", text: item.answer },
    })),
  };
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(json) }} />;
}

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

export default async function Home() {
  const [user, stats, nearMiss, latestRuns, featuredIdeas, publishedIdeas, sampleIdea] = await Promise.all([
    getCurrentUser(),
    getMethodologyStats(),
    getNearestPassingClusters(3),
    listRecentPipelineRuns(1),
    listFeaturedIdeas().catch(() => []),
    listPublishedIdeas().catch(() => []),
    getPublishedIdeaByIdOrSlug("client-ready-pl-exports-for-solo-bookkeepers").catch(() => null),
  ]);

  // Combine featured ideas up to 6, backfilling with published ideas
  const ideasToShow = [...featuredIdeas];
  for (const idea of publishedIdeas) {
    if (ideasToShow.length >= 6) break;
    if (!ideasToShow.some((item) => item.id === idea.id)) {
      ideasToShow.push(idea);
    }
  }

  const resolvedSample =
    sampleIdea ??
    publishedIdeas.find((i) => i.tier === "free") ??
    ideasToShow[0] ??
    null;

  const proofBar: ProofBarData = {
    signalsTracked: stats.signalsIngested,
    clustersEvaluated: stats.clustersFormed,
    clustersPassedThisRun: latestRuns[0]?.clustersPassingBar ?? stats.clustersPassingBar,
    minClusterSize: MIN_CLUSTER_SIZE,
    nearMiss,
  };

  return (
    <>
      <HomeFaqJsonLd />
      <HomeClient
        userEmail={user?.email ?? null}
        proofBar={proofBar}
        featuredIdeas={ideasToShow}
        sampleIdea={resolvedSample}
      />
    </>
  );
}
