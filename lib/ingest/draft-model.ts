import "server-only";
import publicApisData from "@/data/public-apis.json";
import { TOPICS } from "@/lib/topics";
import { generateDraft } from "@/lib/llm/draft-generator";
import type { DataEntity, Evidence, IdeaDrop, MatchedApi, StackItem } from "@/types/idea-drop";
import type { SignalCluster } from "./clustering";
import type { SignalSource } from "./types";

const SOURCE_TO_PLATFORM: Record<SignalSource, Evidence["platform"]> = {
  reddit: "reddit",
  hackernews: "hackernews",
  stackexchange: "stackexchange",
  github: "github",
  devto: "devto",
  lobsters: "lobsters",
  gitlab: "gitlab",
  devrant: "devrant",
  youtube: "youtube",
  codeberg: "codeberg",
  discourse: "discourse",
  mastodon: "mastodon",
  bluesky: "bluesky",
};

const ENGAGEMENT_TYPE: Record<SignalSource, "upvotes" | "replies"> = {
  reddit: "upvotes",
  hackernews: "upvotes",
  stackexchange: "replies",
  github: "replies",
  devto: "upvotes",
  lobsters: "upvotes",
  gitlab: "replies",
  devrant: "upvotes",
  youtube: "upvotes",
  codeberg: "replies",
  discourse: "replies",
  mastodon: "upvotes",
  bluesky: "upvotes",
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

const JSON_SCHEMA_SPEC = `{
  "title": string,
  "category": string,
  "topicTags": string[] (1-2 values, ONLY from: ${TOPICS.map((t) => `"${t}"`).join(", ")}),
  "demandScore": integer 0-100,
  "tier": "free" | "builder" | "studio",
  "problem": { "summary": string, "whoFeelsIt": string },
  "whyNow": string,
  "buildBrief": {
    "coreLoop": string[] (3-5 ordered steps),
    "mvpScope": string[],
    "explicitlyCut": string[],
    "dataModel": [{ "name": string, "fields": string }]
  },
  "matchedApiNames": [{ "name": string, "purpose": string }] (real, well-known free/public APIs only — no URLs, those are looked up separately),
  "launchStack": [{ "layer": "hosting"|"auth"|"database"|"payments"|"storage"|"email"|"other", "tool": string, "freeTierNote": string }],
  "agentPrompts": { "claudeCode": string, "cursorWindsurf": string, "v0Bolt": string },
  "difficulty": { "soloWeekendProject": boolean, "estimatedHours": integer, "skillFloor": "beginner"|"intermediate"|"advanced" }
}`;

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

Respond with ONLY a single JSON object matching this exact shape, no markdown fences, no commentary before or after:

${JSON_SCHEMA_SPEC}`;
}

/** Pulls the first top-level JSON object out of a model response, tolerating markdown fences or stray text around it. */
function extractJson(text: string): DraftedFields {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced ? fenced[1] : text;
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  if (start === -1 || end === -1 || end < start) {
    throw new Error("Model response did not contain a JSON object.");
  }
  return JSON.parse(candidate.slice(start, end + 1)) as DraftedFields;
}

export interface DraftedIdea {
  idea: IdeaDrop;
  provider: "omniroute" | "openrouter";
  model: string;
  tokens: number;
  latencyMs: number;
  fellBack: boolean;
}

/**
 * Draft generation (omniroute-drafts-and-ollama-lockin-spec.md Part 2): one
 * draft-generator call per cluster, producing a pending_review IdeaDrop.
 * Routed to OmniRoute first (falls back to OpenRouter) by
 * lib/llm/draft-generator.ts — this function only owns building the prompt
 * and parsing/shaping the result, not the provider choice. Evidence and
 * matchedApis.sourceUrl are never taken from the model directly — see
 * clusterToEvidence/resolveMatchedApis.
 */
export async function draftIdeaFromCluster(cluster: SignalCluster): Promise<DraftedIdea> {
  const generated = await generateDraft(buildPrompt(cluster));
  const fields = extractJson(generated.content);
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
    platformCount: cluster.platformCount,
    crossPlatform: cluster.crossPlatform,
  };

  return {
    idea,
    provider: generated.provider,
    model: generated.model,
    tokens: generated.tokens,
    latencyMs: generated.latencyMs,
    fellBack: generated.fellBack,
  };
}
