export type SignalSource = "reddit" | "hackernews" | "stackexchange" | "github" | "devto" | "lobsters";

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

export interface RawSignal extends RawSignalInput {
  id: string; // uuid
  clusterKey: string | null;
  draftedIdeaId: string | null;
  fetchedAt: string;
  /** openai/text-embedding-3-small vector, null until the embedding step runs on this signal. */
  embedding: number[] | null;
}
