export type SignalSource = "reddit" | "hackernews" | "stackexchange" | "github" | "devto" | "lobsters" | "gitlab" | "devrant";

/** What a poller (Part A1) produces before it's ever written to the DB. */
export interface RawSignalInput {
  source: SignalSource;
  url: string;
  title: string | null;
  text: string;
  author: string | null;
  engagementMetric: number;
  postedAt: string | null; // ISO datetime
}

/** A poller's output plus how many otherwise-eligible items Part 1 noise filters dropped before insert. */
export interface PollResult {
  signals: RawSignalInput[];
  noiseFiltered: number;
}

export interface RawSignal extends RawSignalInput {
  id: string; // uuid
  clusterKey: string | null;
  draftedIdeaId: string | null;
  fetchedAt: string;
  /** openai/text-embedding-3-small vector, null until the embedding step runs on this signal. */
  embedding: number[] | null;
  /** Quality-pass classification (sourced-pipeline-quality-spec.md Part 2). Null until classified. */
  classifiedAsComplaint: boolean | null;
  problemStatement: string | null;
  domain: string | null;
  classificationConfidence: number | null;
}
