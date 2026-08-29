import type {
  DataEntity,
  Evidence,
  IdeaDrop,
  MatchedApi,
  StackItem,
} from "@/types/idea-drop";

/** Shape of a row in the `idea_drops` table (see supabase/migrations/0001_idea_drops.sql). */
export interface IdeaDropRow {
  id: string;
  slug: string;
  title: string;
  category: string;
  demand_score: number;
  tags: string[];
  published_at: string;
  tier: IdeaDrop["tier"];
  problem: IdeaDrop["problem"];
  evidence: Evidence[];
  why_now: string;
  build_brief: {
    coreLoop: string[];
    mvpScope: string[];
    explicitlyCut: string[];
    dataModel: DataEntity[];
  };
  matched_apis: MatchedApi[];
  launch_stack: StackItem[];
  agent_prompts: IdeaDrop["agentPrompts"];
  difficulty: IdeaDrop["difficulty"];
  status: IdeaDrop["status"];
  validation_errors: string[] | null;
  created_at: string;
  updated_at: string;
}

/** Row -> IdeaDrop. Drops audit columns and turns a null validation_errors into an absent field. */
export function rowToIdeaDrop(row: IdeaDropRow): IdeaDrop {
  const idea: IdeaDrop = {
    id: row.id,
    slug: row.slug,
    title: row.title,
    category: row.category,
    demandScore: row.demand_score,
    tags: row.tags,
    publishedAt: row.published_at,
    tier: row.tier,
    problem: row.problem,
    evidence: row.evidence,
    whyNow: row.why_now,
    buildBrief: row.build_brief,
    matchedApis: row.matched_apis,
    launchStack: row.launch_stack,
    agentPrompts: row.agent_prompts,
    difficulty: row.difficulty,
    status: row.status,
  };

  if (row.validation_errors !== null) {
    idea.validationErrors = row.validation_errors;
  }

  return idea;
}

/** IdeaDrop -> the insert/update payload for `idea_drops`. */
export function ideaDropToRow(
  idea: IdeaDrop,
): Omit<IdeaDropRow, "created_at" | "updated_at"> {
  return {
    id: idea.id,
    slug: idea.slug,
    title: idea.title,
    category: idea.category,
    demand_score: idea.demandScore,
    tags: idea.tags,
    published_at: idea.publishedAt,
    tier: idea.tier,
    problem: idea.problem,
    evidence: idea.evidence,
    why_now: idea.whyNow,
    build_brief: idea.buildBrief,
    matched_apis: idea.matchedApis,
    launch_stack: idea.launchStack,
    agent_prompts: idea.agentPrompts,
    difficulty: idea.difficulty,
    status: idea.status,
    validation_errors: idea.validationErrors ?? null,
  };
}
