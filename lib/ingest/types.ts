export type SignalSource = "reddit" | "hackernews" | "stackexchange" | "github";

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
}
