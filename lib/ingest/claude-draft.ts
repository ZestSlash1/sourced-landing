import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import publicApisData from "@/data/public-apis.json";
import { TOPICS } from "@/lib/topics";
import type { DataEntity, Evidence, IdeaDrop, MatchedApi, StackItem } from "@/types/idea-drop";
import type { SignalCluster } from "./clustering";
import type { SignalSource } from "./types";

const MODEL = process.env.ANTHROPIC_DRAFT_MODEL ?? "claude-sonnet-5";

const SOURCE_TO_PLATFORM: Record<SignalSource, Evidence["platform"]> = {
  reddit: "reddit",
  hackernews: "hackernews",
  stackexchange: "stackexchange",
  github: "github",
};

const ENGAGEMENT_TYPE: Record<SignalSource, "upvotes" | "replies"> = {
  reddit: "upvotes",
  hackernews: "upvotes",
  stackexchange: "replies",
  github: "replies",
};

interface DraftedFields {
  title: string;
  category: string;
  topicTags: string[];
  demandScore: number;
  tier: IdeaDrop["tier"];
  problem: { summary: string; whoFeelsIt: string };
  whyNow: string;
  buildBrief: {
    coreLoop: string[];
    mvpScope: string[];
    explicitlyCut: string[];
    dataModel: DataEntity[];
  };
  matchedApiNames: { name: string; purpose: string }[];
  launchStack: StackItem[];
  agentPrompts: IdeaDrop["agentPrompts"];
  difficulty: IdeaDrop["difficulty"];
}

const DRAFT_TOOL: Anthropic.Tool = {
  name: "submit_idea_draft",
  description: "Submit a structured Sourced idea drop draft from the given evidence.",
  input_schema: {
    type: "object",
    properties: {
      title: { type: "string" },
      category: { type: "string" },
      topicTags: {
        type: "array",
        items: { type: "string", enum: [...TOPICS] },
        description: "1-2 topics from the fixed list that best fit this idea.",
      },
      demandScore: { type: "integer", minimum: 0, maximum: 100 },
      tier: { type: "string", enum: ["free", "builder", "studio"] },
      problem: {
        type: "object",
        properties: {
          summary: { type: "string" },
          whoFeelsIt: { type: "string" },
        },
        required: ["summary", "whoFeelsIt"],
      },
      whyNow: { type: "string" },
      buildBrief: {
        type: "object",
        properties: {
          coreLoop: { type: "array", items: { type: "string" } },
          mvpScope: { type: "array", items: { type: "string" } },
          explicitlyCut: { type: "array", items: { type: "string" } },
          dataModel: {
            type: "array",
            items: {
              type: "object",
              properties: { name: { type: "string" }, fields: { type: "string" } },
              required: ["name", "fields"],
            },
          },
        },
        required: ["coreLoop", "mvpScope", "explicitlyCut", "dataModel"],
      },
      matchedApiNames: {
        type: "array",
        description:
          "Names of well-known free/public APIs this idea would use — exact names only, no URLs (those are looked up separately).",
        items: {
          type: "object",
          properties: { name: { type: "string" }, purpose: { type: "string" } },
          required: ["name", "purpose"],
        },
      },
      launchStack: {
        type: "array",
        items: {
          type: "object",
          properties: {
            layer: {
              type: "string",
              enum: ["hosting", "auth", "database", "payments", "storage", "email", "other"],
            },
            tool: { type: "string" },
            freeTierNote: { type: "string" },
          },
          required: ["layer", "tool", "freeTierNote"],
        },
      },
      agentPrompts: {
        type: "object",
        properties: {
          claudeCode: { type: "string" },
          cursorWindsurf: { type: "string" },
          v0Bolt: { type: "string" },
        },
        required: ["claudeCode", "cursorWindsurf", "v0Bolt"],
      },
      difficulty: {
        type: "object",
        properties: {
          soloWeekendProject: { type: "boolean" },
          estimatedHours: { type: "integer" },
          skillFloor: { type: "string", enum: ["beginner", "intermediate", "advanced"] },
        },
        required: ["soloWeekendProject", "estimatedHours", "skillFloor"],
      },
    },
    required: [
      "title", "category", "topicTags", "demandScore", "tier", "problem", "whyNow",
      "buildBrief", "matchedApiNames", "launchStack", "agentPrompts", "difficulty",
    ],
  },
};

function truncate(text: string, max = 600): string {
  return text.length > max ? `${text.slice(0, max)}...` : text;
}

/**
 * Turns a cluster of raw_signals directly into Evidence[] — deterministic,
 * not model-generated, so a source URL can never be fabricated (Decision
 * #2/A3): every url, date, and engagement number here comes straight from
 * what the poller actually fetched.
 */
function clusterToEvidence(cluster: SignalCluster): Evidence[] {
  return cluster.signals.map((s) => ({
    platform: SOURCE_TO_PLATFORM[s.source],
    quote: truncate(s.title ? `${s.title} — ${s.text}` : s.text, 300),
    url: s.url,
    date: (s.postedAt ?? s.fetchedAt).slice(0, 10),
    engagementMetric: { type: ENGAGEMENT_TYPE[s.source], value: s.engagementMetric },
  }));
}

/**
 * Cross-checks the model's suggested API names against the synced
 * public-apis catalog (data/public-apis.json) and drops anything that
 * isn't a real, exact match — same "never invent a URL" rule as evidence,
 * applied to matchedApis.sourceUrl.
 */
function resolveMatchedApis(names: { name: string; purpose: string }[]): MatchedApi[] {
  const entries = (publicApisData as { entries: { name: string; url: string }[] }).entries;
  const byName = new Map(entries.map((e) => [e.name.toLowerCase(), e]));

  const resolved: MatchedApi[] = [];
  for (const { name, purpose } of names) {
    const entry = byName.get(name.toLowerCase());
    if (!entry) continue;
    resolved.push({ name: entry.name, purpose, freeTierLimit: "See provider docs", sourceUrl: entry.url });
  }
  return resolved;
}

function buildPrompt(cluster: SignalCluster): string {
  const evidenceBlock = cluster.signals
    .map(
      (s, i) =>
        `[${i + 1}] source=${s.source} url=${s.url} engagement=${s.engagementMetric} posted=${s.postedAt ?? "unknown"}\n${s.title ? `title: ${s.title}\n` : ""}text: ${truncate(s.text, 800)}`,
    )
    .join("\n\n");

  return `You are drafting a Sourced idea drop from real complaints scraped from developer/creator forums. Sourced sells validated startup ideas — the whole product depends on evidence being real, so:

- Do NOT invent URLs, quotes, or statistics. You are given ${cluster.signals.length} real signals below; base problem/whyNow/demandScore entirely on them.
- matchedApiNames must be well-known, real, currently-existing free/public APIs — exact names (you may be wrong about some; unmatched ones will be dropped automatically, so prefer being conservative).
- launchStack must be real, well-known dev tools with real free tiers (Vercel, Supabase, Resend, Cloudflare R2, etc.) — no invented products.

Signals (same underlying complaint, from ${new Set(cluster.signals.map((s) => s.source)).size} different platforms):

${evidenceBlock}

Call submit_idea_draft with your structured draft.`;
}

/**
 * Draft generation (Part A3): one Claude call per cluster, producing a
 * pending_review IdeaDrop. Evidence and matchedApis.sourceUrl are never
 * taken from the model directly — see clusterToEvidence/resolveMatchedApis.
 */
export async function draftIdeaFromCluster(cluster: SignalCluster): Promise<IdeaDrop> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("Missing ANTHROPIC_API_KEY environment variable.");

  const client = new Anthropic({ apiKey });
  const message = await client.messages.create({
    model: MODEL,
    max_tokens: 4096,
    tools: [DRAFT_TOOL],
    tool_choice: { type: "tool", name: "submit_idea_draft" },
    messages: [{ role: "user", content: buildPrompt(cluster) }],
  });

  const toolUse = message.content.find(
    (block): block is Anthropic.ToolUseBlock => block.type === "tool_use",
  );
  if (!toolUse) throw new Error("Claude did not return a submit_idea_draft tool call.");

  const fields = toolUse.input as DraftedFields;
  const evidence = clusterToEvidence(cluster);
  const now = new Date();
  const slug = fields.title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 60);

  const idea: IdeaDrop = {
    id: `sourced-${now.toISOString().slice(0, 10)}-${cluster.key.slice(0, 8)}`,
    slug,
    title: fields.title,
    category: fields.category,
    demandScore: fields.demandScore,
    tags: fields.topicTags,
    publishedAt: now.toISOString().slice(0, 10),
    tier: fields.tier,
    problem: fields.problem,
    evidence,
    whyNow: fields.whyNow,
    buildBrief: fields.buildBrief,
    matchedApis: resolveMatchedApis(fields.matchedApiNames),
    launchStack: fields.launchStack,
    agentPrompts: fields.agentPrompts,
    difficulty: fields.difficulty,
    status: "pending_review",
    featured: false,
    sourceSignalIds: cluster.signals.map((s) => s.id),
  };

  return idea;
}
