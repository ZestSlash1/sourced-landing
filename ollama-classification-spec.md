# Sourced — Ollama Classification Swap Spec

## Context

The ingest pipeline runs a per-signal classification LLM call that returns
`{is_complaint, problem_statement, domain, confidence}`. This currently hits
OpenRouter (`google/gemini-3.5-flash-lite`, max_tokens 300). That call is the
bottleneck on ingest volume because every doubling of signals doubles the cost.

The homelab machine `falcon` (Windows) can run Ollama locally, which turns per-call
cost to zero and lets us aggressively expand poller coverage without a bill spike.
OpenRouter stays as the fallback so the pipeline still works when run from Vercel
cron or from a laptop off the home network.

Classification is a good fit for local models because the task is narrow
(complaint detection + short normalisation) and small models handle it well when
the output is JSON-constrained.

## Goal

Route every classification call to Ollama when available, fall back to OpenRouter
otherwise. Keep the final draft-generation call (which needs quality) on
OpenRouter regardless. No changes to what gets stored or how downstream stages
consume the classification result.

## Non-goals

- Moving draft generation to Ollama. That stays on OpenRouter for quality.
- Moving embedding generation to Ollama. Keep OpenRouter's
  `text-embedding-3-small` — dimensions and semantics must stay identical for the
  pgvector migration to work.
- Building a queue or job runner. Sequential classification is fine at current
  volume.

## Architecture decision

Two possible topologies. Pick option 1.

**Option 1 (chosen): local-only classification, triggered from falcon.**
The pipeline runs on falcon (or any machine on the same LAN) as a script.
Ollama listens on `http://localhost:11434`. Vercel cron does NOT run the
classifier. Vercel only serves the site, handles payments, and reads published
briefs. Simpler, no auth to expose, no tunnel needed for this piece.

**Option 2 (rejected): expose Ollama via Cloudflare Tunnel.**
Would let Vercel cron call it too, but adds auth complexity (bearer token,
Cloudflare Access, IP allowlisting) and a single point of failure. Not worth it
until pipeline actually needs to run outside falcon.

If a future Vercel cron ever tries to classify without Ollama available, it
should transparently fall back to OpenRouter and log the fallback in
`pipeline_runs`.

## Prerequisites on falcon

Install and start Ollama:

```powershell
# On falcon (Windows PowerShell)
winget install Ollama.Ollama
# Or download from https://ollama.com/download/windows

# Pull a fast, JSON-good model — Qwen 2.5 7B Instruct is the recommended pick
ollama pull qwen2.5:7b-instruct

# Verify
ollama run qwen2.5:7b-instruct "return only the JSON {\"ok\": true}"
```

Ollama will listen on `http://localhost:11434` automatically. On Windows it runs
as a service after install.

Model choice rationale:
- `qwen2.5:7b-instruct` — best JSON-mode adherence at 7B, ~5GB VRAM, fast on
  any modern GPU or even CPU. First choice.
- Fallback if the machine can't hold 7B: `qwen2.5:3b-instruct` (~2GB, still
  competent for this task).
- Do NOT use `llama3.2:3b` for this — worse JSON adherence than Qwen.

## Code changes

### 1. New module: `lib/llm/classifier.ts`

Single entry point the pipeline calls. Hides the provider choice.

```ts
export interface ClassifierInput {
  signalId: string;
  title: string;
  body: string;
  platform: string;
}

export interface ClassifierOutput {
  isComplaint: boolean;
  problemStatement: string | null;
  domain: string | null;
  confidence: number;
  provider: 'ollama' | 'openrouter'; // for observability
  latencyMs: number;
}

export async function classify(input: ClassifierInput): Promise<ClassifierOutput>;
```

Internally:
1. If `OLLAMA_URL` env var is set, try Ollama first
2. If Ollama call fails (network error, non-200, invalid JSON after 2 retries),
   fall back to OpenRouter
3. If Ollama is unset and OpenRouter is unset, throw a hard error at pipeline
   startup (not per-call)
4. Return the output with `provider` populated so pipeline_runs can log the mix

### 2. Ollama adapter: `lib/llm/providers/ollama.ts`

Uses the `/api/generate` endpoint with `format: "json"` mode. Prompt template:

```
You are a classifier. Given a developer forum post, return ONLY valid JSON
matching this exact schema, with no prose before or after:

{
  "isComplaint": boolean,   // true if the post expresses a problem, frustration, or unmet need
  "problemStatement": string | null,  // 1-sentence normalised problem (null if not a complaint)
  "domain": string | null,  // short domain tag e.g. "auth", "billing", "deployment", "testing"
  "confidence": number       // 0.0 to 1.0
}

Post platform: {platform}
Post title: {title}
Post body: {body_truncated_to_1500_chars}
```

Request:

```ts
POST http://localhost:11434/api/generate
{
  "model": "qwen2.5:7b-instruct",
  "prompt": "<the above>",
  "format": "json",
  "stream": false,
  "options": {
    "temperature": 0.1,
    "num_predict": 300
  }
}
```

Parse `response.response` as JSON. Retry twice on parse failure with slightly
elevated temperature (0.2, 0.3) before falling back to OpenRouter.

### 3. OpenRouter adapter: `lib/llm/providers/openrouter.ts`

Extract the existing OpenRouter call into this file. Same prompt, same
`max_tokens: 300`, same model. This is a refactor, not a rewrite.

### 4. Pipeline call site update

Find where the classifier is currently called (search for the OpenRouter
completion with the classification prompt). Replace with:

```ts
import { classify } from '@/lib/llm/classifier';

const result = await classify({
  signalId: signal.id,
  title: signal.title,
  body: signal.body,
  platform: signal.source,
});

// Log provider for observability
providerCounts[result.provider] = (providerCounts[result.provider] ?? 0) + 1;
```

Aggregate `providerCounts` and write to `pipeline_runs.meta` at end of run so
you can see the local/remote mix per pipeline run.

### 5. Startup validation

In `scripts/poll-all.ts` at startup, log which provider will be used:

```
[classifier] Ollama available at http://localhost:11434 (model: qwen2.5:7b-instruct)
[classifier] OpenRouter fallback configured
```

Or on Vercel cron:

```
[classifier] Ollama unavailable, using OpenRouter (model: google/gemini-3.5-flash-lite)
```

## Environment variables

Add to `.env.local` on falcon:

```
OLLAMA_URL=http://localhost:11434
OLLAMA_CLASSIFIER_MODEL=qwen2.5:7b-instruct
```

Do NOT add these to Vercel production env. Vercel cron should fall back to
OpenRouter automatically because `OLLAMA_URL` is unset there.

Keep existing:

```
OPENROUTER_API_KEY=<existing>
OPENROUTER_CLASSIFIER_MODEL=google/gemini-3.5-flash-lite
```

## Observability

Extend `pipeline_runs.meta` (jsonb) to include:

```json
{
  "classifier": {
    "ollama_calls": 380,
    "openrouter_calls": 14,
    "ollama_avg_latency_ms": 420,
    "openrouter_avg_latency_ms": 890,
    "fallbacks": 14,
    "parse_failures": 3
  }
}
```

Also add an `/admin/analytics` card showing "Classification provider mix — last
10 runs" as a stacked bar. Trivial addition to the existing dashboard.

## Cost model check

Before running for real, run `scripts/classifier-parity.ts`:

- Pick 50 random signals already classified via OpenRouter
- Reclassify each via Ollama
- Compare `isComplaint` (exact match rate)
- Compare `domain` (exact match or semantically equivalent, log for manual review)
- Compare `problemStatement` (cosine similarity of embeddings — should be > 0.85
  for equivalent classifications)
- Report per-field agreement rate

Target: > 90% agreement on `isComplaint`, > 80% domain overlap. Below that,
prompt engineering is needed before switching production traffic.

## Acceptance criteria

- [ ] Ollama installed on falcon, `qwen2.5:7b-instruct` pulled, service running
- [ ] `curl http://localhost:11434/api/tags` returns the model list
- [ ] `lib/llm/classifier.ts` exists and exports `classify()` with the interface above
- [ ] `lib/llm/providers/ollama.ts` and `lib/llm/providers/openrouter.ts` exist and are pure functions (no top-level side effects)
- [ ] Existing OpenRouter classification call site now uses `classify()`
- [ ] Parity script run against 50 signals shows > 90% `isComplaint` agreement
- [ ] One full pipeline run completed on falcon logs `provider: 'ollama'` for every signal
- [ ] Same pipeline run triggered from a machine without Ollama falls back to OpenRouter cleanly, logs the fallback count
- [ ] `pipeline_runs.meta.classifier` populated on every run
- [ ] Admin analytics dashboard shows the provider mix card

## Rollback plan

Delete `OLLAMA_URL` from `.env.local`. Pipeline transparently uses OpenRouter
for everything. No data corruption possible because the output schema is
identical.

If a specific pipeline run produced bad classifications from Ollama:

```sql
update raw_signals
set classification = null, cluster_key = null
where classified_at > '<bad run start time>'
  and classified_at < '<bad run end time>';
```

Then re-run the pipeline with `OLLAMA_URL` unset to reclassify via OpenRouter.

## Notes for the implementer

- Ollama's JSON mode is `format: "json"` at the top level of the request, NOT
  inside `options`. Easy to get wrong.
- Ollama's `num_predict` is the equivalent of `max_tokens`. Set it to 300 to
  match OpenRouter.
- Do NOT stream. `stream: false`. Streaming complicates JSON parsing and there's
  no UX benefit here.
- Truncate signal body to 1500 chars before prompting. Long bodies eat context
  and don't improve classification.
- Log latency per call. If Ollama is consistently slower than OpenRouter,
  something is wrong with the model or hardware allocation (GPU not being used).
- Keep the OpenRouter call path warm even when Ollama is primary. If it goes
  stale you'll only find out during an outage.
- Do not run classification and embedding on the same pass without checking
  Ollama's queue. Ollama serialises requests by default.
