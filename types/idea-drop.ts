export interface IdeaDrop {
  id: string; // "sourced-2026-08-29-001"
  slug: string; // url-safe, derived from title
  title: string;
  category: string;
  demandScore: number; // 0-100, computed at ingest
  tags: string[];
  publishedAt: string; // ISO date
  tier: "free" | "builder" | "studio"; // minimum tier required to view full drop

  problem: {
    summary: string; // 1-2 sentences
    whoFeelsIt: string; // target user description
  };

  evidence: Evidence[]; // min 3, validated at ingest

  whyNow: string; // 1-2 sentences

  buildBrief: {
    coreLoop: string[]; // ordered steps, 3-5 items
    mvpScope: string[]; // what's IN
    explicitlyCut: string[]; // what's OUT
    dataModel: DataEntity[];
  };

  matchedApis: MatchedApi[];

  launchStack: StackItem[];

  agentPrompts: {
    claudeCode: string;
    cursorWindsurf: string;
    v0Bolt: string;
  };

  difficulty: {
    soloWeekendProject: boolean;
    estimatedHours: number;
    skillFloor: "beginner" | "intermediate" | "advanced";
  };

  status: "draft" | "needs_evidence" | "published" | "pending_review";
  validationErrors?: string[]; // populated when status = "needs_evidence"

  updatedAt?: string; // ISO timestamp, DB-managed — absent on ideas not yet round-tripped through the DB

  featured?: boolean; // admin-curated, shown to logged-out/no-topic feed visitors
  sourceSignalIds?: string[]; // raw_signals this draft came from, for the admin review queue

  // Set at draft time from the source cluster (SignalCluster.platformCount /
  // .crossPlatform) — not re-derived from evidence[], so it survives an admin
  // editing the evidence list. Absent on ideas drafted before this field
  // existed; callers should treat that as unknown, not single-platform.
  platformCount?: number;
  crossPlatform?: boolean;

  // Grounded in a real web search at draft time (see
  // lib/ingest/competitive-landscape.ts) — never an LLM answering from
  // memory. Null/absent means no check has run, or the search failed;
  // that's an honest "unknown", not the same as no_direct_competitor.
  competitiveLandscape?: CompetitiveLandscape | null;
}

export interface CompetitiveLandscape {
  verdict: "no_direct_competitor" | "partial_overlap" | "close_competitor_exists";
  existingSolutions: { name: string; url: string; gap: string }[];
  checkedAt: string; // ISO timestamp
  searchQueryUsed: string;
}

export interface Evidence {
  platform: "reddit" | "g2" | "upwork" | "twitter" | "hackernews" | "stackexchange" | "github" | "devto" | "lobsters" | "gitlab" | "devrant" | "youtube" | "codeberg" | "discourse" | "mastodon" | "other";
  subforum?: string; // e.g. "r/SaaS", or product name for G2
  quote: string; // paraphrased or short direct quote
  url: string;
  date: string; // ISO date
  engagementMetric?: {
    type: "upvotes" | "budget_usd" | "review_rating" | "replies";
    value: number;
  };
}

/** Derived live from source_signal_ids joined to raw_signals — never stored. */
export interface TriangulationStats {
  signalCount: number;
  platformCount: number;
  daySpan: number; // days between the earliest and latest posted_at
}

/** A public link back to one originating complaint, derived the same way. */
export interface SourceLink {
  source: string; // raw_signals.source, e.g. "hackernews"
  url: string;
  title: string | null;
  postedAt: string | null;
}

export interface DataEntity {
  name: string; // e.g. "User", "Listing"
  fields: string; // freeform, e.g. "id, email, plan_tier, created_at"
}

export interface MatchedApi {
  name: string;
  purpose: string; // what it does for THIS idea specifically
  freeTierLimit: string; // e.g. "100 req/day"
  sourceUrl: string; // public-apis link
}

export interface StackItem {
  layer: "hosting" | "auth" | "database" | "payments" | "storage" | "email" | "other";
  tool: string;
  freeTierNote: string;
  sourceUrl?: string; // free-for-dev link
}

// The shape sent to under-tier users
export type IdeaDropTeaser = Pick<
  IdeaDrop,
  | "id"
  | "slug"
  | "title"
  | "category"
  | "demandScore"
  | "tags"
  | "publishedAt"
  | "tier"
  | "problem"
  | "status"
> & {
  evidence: Evidence[]; // full — evidence is public regardless of tier/quota
  locked: true;
};
