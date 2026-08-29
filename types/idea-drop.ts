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

  status: "draft" | "needs_evidence" | "published";
  validationErrors?: string[]; // populated when status = "needs_evidence"
}

export interface Evidence {
  platform: "reddit" | "g2" | "upwork" | "twitter" | "hackernews" | "other";
  subforum?: string; // e.g. "r/SaaS", or product name for G2
  quote: string; // paraphrased or short direct quote
  url: string;
  date: string; // ISO date
  engagementMetric?: {
    type: "upvotes" | "budget_usd" | "review_rating" | "replies";
    value: number;
  };
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
  evidence: Evidence[]; // truncated to exactly 1 item
  locked: true;
};
