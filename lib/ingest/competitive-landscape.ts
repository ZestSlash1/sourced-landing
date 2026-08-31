// No "server-only" import here — this module is also imported directly by
// scripts/backfill-competitive-landscape.ts, a plain tsx/node script outside
// Next.js's react-server condition, where the server-only marker package
// throws unconditionally. Same convention as classification.ts/embeddings.ts.
import type { CompetitiveLandscape } from "@/types/idea-drop";

// OpenRouter's `:online` suffix attaches a real web-search plugin (Exa) to
// any model — the model's completion comes back with the search results
// injected as context and, when it cites them, an `annotations` array of
// `url_citation` entries. That's the one piece of ground truth this module
// trusts: any competitor URL not backed by a citation gets dropped, no
// matter what the model's JSON claims. This is the hard constraint the
// feature exists for (sourced-competitive-gap-spec.md) — a model listing
// competitors from training-data memory is exactly the hallucination risk
// Sourced positions itself against.
const MODEL = process.env.OPENROUTER_COMPETITIVE_MODEL ?? "openai/gpt-4o-mini";
const ONLINE_MODEL = `${MODEL}:online`;
const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

// Same rough-estimate rationale as classification.ts's USD_PER_TOKEN.
const USD_PER_TOKEN = 0.5 / 1_000_000;
// OpenRouter's web plugin bills a flat per-request fee on top of tokens
// (roughly $4 per 1000 searches at time of writing) — approximated here,
// not looked up per-call, same spirit as the token rate above.
const WEB_SEARCH_SURCHARGE_USD = 0.004;

export interface CompetitiveCheckStats {
  requested: number;
  checked: number;
  errors: string[];
  costUsd: number;
}

interface RawCompetitiveCheck {
  verdict?: "no_direct_competitor" | "partial_overlap" | "close_competitor_exists";
  existing_solutions?: { name?: string; url?: string; gap?: string }[];
  search_query_used?: string;
}

interface UrlCitation {
  url: string;
}

function buildPrompt(problemStatement: string): string {
  return `Search the web right now for existing tools, products, or open-source projects that already solve this specific problem:

"${problemStatement}"

Only report a tool as an existing solution if you found a real page for it in this search — never list something from memory alone. For each one, give its real URL from the search results.

Respond with ONLY a single JSON object, no markdown fences, no commentary:
{
  "verdict": "no_direct_competitor" | "partial_overlap" | "close_competitor_exists",
  "existing_solutions": [{ "name": string, "url": string, "gap": "one sentence: what it covers and what it doesn't relative to this exact problem" }],
  "search_query_used": string — the actual query you searched for
}

"no_direct_competitor" with an empty existing_solutions array is a perfectly good, expected answer when nothing turns up — do not force a match. Use "close_competitor_exists" only when a tool solves essentially the same problem for the same audience.`;
}

/** Pulls the first top-level JSON object out of a model response, tolerating markdown fences or stray text around it. */
function extractJson(text: string): RawCompetitiveCheck {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced ? fenced[1] : text;
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  if (start === -1 || end === -1 || end < start) {
    throw new Error("Model response did not contain a JSON object.");
  }
  return JSON.parse(candidate.slice(start, end + 1)) as RawCompetitiveCheck;
}

function hostnameOf(url: string): string | null {
  try {
    return new URL(url).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return null;
  }
}

/**
 * Cross-checks the model's claimed existing_solutions against the search
 * engine's own citations (annotations) — same "never invent a URL" rule
 * draft-model.ts applies to matchedApis, applied here to competitor URLs.
 * A solution whose URL's hostname isn't among the citations is dropped
 * rather than trusted.
 */
function groundSolutions(
  raw: { name?: string; url?: string; gap?: string }[] | undefined,
  citations: UrlCitation[],
): { name: string; url: string; gap: string }[] {
  const citedHosts = new Set(citations.map((c) => hostnameOf(c.url)).filter((h): h is string => h !== null));
  if (citedHosts.size === 0) return [];

  const grounded: { name: string; url: string; gap: string }[] = [];
  for (const s of raw ?? []) {
    if (!s.name || !s.url || !s.gap) continue;
    const host = hostnameOf(s.url);
    if (host && citedHosts.has(host)) {
      grounded.push({ name: s.name, url: s.url, gap: s.gap });
    }
  }
  return grounded;
}

/**
 * One OpenRouter `:online` call per cluster, run once at draft time (never
 * on every pipeline pass — see the manual re-check route for anything
 * later). Throws on malformed/failed responses or on a search that returned
 * no citations at all — callers must catch and leave competitiveLandscape
 * null rather than fabricate a fallback.
 */
export async function checkCompetitiveLandscape(
  problemStatement: string,
): Promise<{ result: CompetitiveLandscape; costUsd: number }> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error("Missing OPENROUTER_API_KEY environment variable.");

  const res = await fetch(OPENROUTER_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "https://sourced.app",
      "X-Title": "Sourced competitive check",
    },
    body: JSON.stringify({
      model: ONLINE_MODEL,
      messages: [{ role: "user", content: buildPrompt(problemStatement) }],
      temperature: 0.2,
      // Without an explicit cap, OpenRouter defaults to the model's max
      // (16384 for gpt-4o-mini), which a low-credit account can't afford —
      // this task only needs a short JSON verdict, not a long completion.
      max_tokens: 1000,
    }),
  });

  if (!res.ok) {
    throw new Error(`OpenRouter competitive-check request failed: ${res.status} ${await res.text()}`);
  }

  const body = (await res.json()) as {
    choices: { message: { content: string; annotations?: { type: string; url_citation?: UrlCitation }[] } }[];
    usage?: { total_tokens?: number };
  };
  const message = body.choices[0]?.message;
  if (!message?.content) throw new Error("OpenRouter competitive-check returned no message content.");

  const citations = (message.annotations ?? [])
    .filter((a) => a.type === "url_citation" && a.url_citation)
    .map((a) => a.url_citation as UrlCitation);

  if (citations.length === 0) {
    throw new Error("Web search returned no citations — refusing to trust the model's memory for a competitive check.");
  }

  const raw = extractJson(message.content);
  if (!raw.verdict || !raw.search_query_used) {
    throw new Error("Malformed competitive-check response: missing verdict/search_query_used.");
  }

  const existingSolutions = groundSolutions(raw.existing_solutions, citations);
  // If every claimed solution got filtered out for lacking a citation, the
  // only honest verdict left is "no evidence of a direct competitor" — never
  // keep a close_competitor_exists/partial_overlap verdict with nothing to
  // back it.
  const verdict = existingSolutions.length === 0 ? "no_direct_competitor" : raw.verdict;

  const result: CompetitiveLandscape = {
    verdict,
    existingSolutions,
    checkedAt: new Date().toISOString(),
    searchQueryUsed: raw.search_query_used,
  };

  const tokens = body.usage?.total_tokens ?? Math.ceil(problemStatement.length / 4) + 400;
  const costUsd = tokens * USD_PER_TOKEN + WEB_SEARCH_SURCHARGE_USD;
  return { result, costUsd };
}

/**
 * Batch wrapper matching classification.ts's pattern — one call per problem
 * statement, capped, per-item failures caught and logged rather than
 * aborting the run. Not currently used by runDraftPass (which checks
 * per-cluster inline, since it's naturally capped by the daily draft cap),
 * but kept for the backfill script and for symmetry with the other stages.
 */
export async function checkCompetitiveLandscapes(
  items: { id: string; problemStatement: string }[],
  options: { cap?: number } = {},
): Promise<{ results: { id: string; result: CompetitiveLandscape }[]; stats: CompetitiveCheckStats }> {
  const pool = options.cap ? items.slice(0, options.cap) : items;
  const stats: CompetitiveCheckStats = { requested: pool.length, checked: 0, errors: [], costUsd: 0 };
  const results: { id: string; result: CompetitiveLandscape }[] = [];

  for (const item of pool) {
    try {
      const { result, costUsd } = await checkCompetitiveLandscape(item.problemStatement);
      results.push({ id: item.id, result });
      stats.checked++;
      stats.costUsd += costUsd;
    } catch (err) {
      stats.errors.push(`${item.id}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  return { results, stats };
}
