# Sourced — Full Local/Free Pipeline Spec (Ollama Classification + OmniRoute Drafts)

## Context

Two decisions made this session:

1. **Classification moves fully to Ollama**, no OpenRouter fallback. The
   classification prompt was already tightened (separate spec,
   `classification-prompt-tightening-spec.md`) to fix a systematic
   false-negative pattern where Ollama under-detected complaints on
   GitHub/GitLab issue-tracker posts. That fix needs to be confirmed working
   before this spec is considered done.

2. **Draft generation moves to OmniRoute** (self-hosted AI gateway on falcon,
   `http://localhost:20128`, currently routing to `gemini-3.1-pro`). Manually
   tested via curl — produced clean, well-structured, non-truncated output
   comparable to what OpenRouter was producing. OmniRoute's Gemini
   integration was previously broken (stale credential) but is now confirmed
   working as of this session.

Net effect: **OpenRouter becomes fully optional.** It is no longer required
for the pipeline to run day-to-day. It stays in the codebase as a dormant
fallback path only — cheap insurance, zero ongoing cost since it won't be
called under normal operation.

## Goal

1. Confirm the classification prompt fix actually closed the gemini-3.1-pro-vs-Ollama
   (or OpenRouter-vs-Ollama, budget-permitting) gap and lock in the local
   classifier model.
2. Route draft generation through OmniRoute instead of OpenRouter.
3. Make explicit in code and docs that OpenRouter is now a fallback-only
   dependency, not a required one — the pipeline should run start to finish
   with $0 OpenRouter balance.

## Non-goals

- Removing the OpenRouter adapter code entirely. Keep it as the fallback path.
- Changing the classification prompt further in this pass (that's done,
  separate spec — this pass only verifies it worked).
- Changing pgvector/clustering. Separate spec, separate pass.
- Building a queue, retry system, or job runner for OmniRoute calls. Keep it
  as simple as the current OpenRouter call was.

## Part 1 — Confirm classification is ready to lock in

### Step 1.1 — Rerun the parity/validation check

The original parity script (`scripts/classifier-parity.ts`) compares Ollama
against OpenRouter. Given OpenRouter has $0 balance, this script will fail on
the OpenRouter leg (`402 Insufficient credits`) unless a small top-up happens
first, OR the script is adjusted to compare Ollama against itself across the
prompt change (before/after), OR validation moves to manual review.

**Recommended: manual review, since OpenRouter dependency is being removed
anyway — no reason to spend money validating something we're about to stop
using as ground truth.**

Build `scripts/classifier-review-sample.ts`:

```ts
// Pulls 30 signals not yet classified (or force-reclassify 30 already-classified ones)
// Runs classify() via Ollama only (OLLAMA_URL set, gemini/openrouter not called)
// Prints to console: title, text (truncated to 300 chars), isComplaint, domain,
//   problemStatement, confidence — one block per signal, clearly separated
// No comparison logic needed — this is for human eyeballing
```

Run it:

```
npx tsx scripts/classifier-review-sample.ts
```

Read through the 30 outputs. Using the tightened prompt's definition (complaint
requires genuine frustration/blocked state, not just any GitHub issue or
feature request), judge whether each classification looks right. This is a
judgment call — you're checking "does this look like a human using the
definition in the prompt would classify it," not comparing against another
model's opinion.

### Step 1.2 — Decision

- **If the sample looks solid** (most classifications reasonable, no obvious
  systematic pattern like the earlier all-false-negative issue on GitHub/GitLab
  posts): lock in gemma3:4b as the classifier. Update `.env.local` if not
  already set, confirm `OLLAMA_CLASSIFIER_MODEL=gemma3:4b`.
- **If a new systematic pattern shows up**: note it, this becomes a follow-up
  prompt iteration. Don't block Part 2 on this — draft generation and
  classification are independent, OmniRoute work can proceed regardless.

## Part 2 — Route draft generation through OmniRoute

### Step 2.1 — New provider adapter

Create `lib/llm/providers/omniroute.ts`, following the same shape as the
existing `openrouter.ts` adapter (pure function, no side effects):

```ts
export interface OmniRouteDraftInput {
  clusterId: string;
  signals: { title: string; text: string; url: string; source: string }[];
  // whatever shape the existing draft-generation prompt already consumes —
  // match the existing input type used by the OpenRouter draft call, don't
  // invent a new shape
}

export async function generateDraftViaOmniRoute(
  input: OmniRouteDraftInput
): Promise<DraftGenerationOutput>; // reuse the existing output type
```

Request shape, based on the working curl test:

```ts
POST http://localhost:20128/v1/chat/completions
{
  "model": "auto",
  "stream": false,
  "messages": [
    { "role": "user", "content": "<existing draft-generation prompt, unchanged>" }
  ]
}
```

Important: **the prompt text itself does not change.** This is a transport
swap, not a content change. Whatever prompt currently goes to OpenRouter for
draft generation goes to OmniRoute unmodified. Extract it into a shared
function if it isn't already, so both adapters use the identical prompt
(same principle as the classification prompt consolidation).

Parse the response the same way as OpenRouter's (same OpenAI-compatible
`choices[0].message.content` shape — confirmed by the manual curl test, the
response format matches).

### Step 2.2 — New entry point: `lib/llm/draft-generator.ts`

Same pattern as `lib/llm/classifier.ts` from the earlier Ollama spec — a
single entry point that hides the provider choice:

```ts
export async function generateDraft(input: DraftGenerationInput): Promise<DraftGenerationOutput> {
  // 1. If OMNIROUTE_URL is set, try OmniRoute first
  // 2. If OmniRoute fails (network error, non-200, malformed response,
  //    empty content) after 1 retry, fall back to OpenRouter
  // 3. If OmniRoute is unset and OpenRouter is unset, throw a hard error
  //    at pipeline startup (not per-call)
  // 4. Return output with `provider: 'omniroute' | 'openrouter'` populated
  //    for observability, same pattern as the classifier
}
```

### Step 2.3 — Pipeline call site update

Find wherever draft generation is currently called (search for the
OpenRouter completion call with the draft-generation prompt — likely in a
file like `lib/pipeline/generate-draft.ts` or similar, adjacent to where the
classification call site was before the Ollama swap). Replace with:

```ts
import { generateDraft } from '@/lib/llm/draft-generator';

const draft = await generateDraft({ clusterId, signals });
```

Log `draft.provider` into `pipeline_runs`, same convention as the classifier
provider mix tracking from the earlier Ollama spec. Extend
`pipeline_runs` with columns for draft-generation provider counts, following
whatever flat-column convention was used for the classifier columns (per the
implementation summary — flat columns were preferred over jsonb).

### Step 2.4 — Environment variables

Add to `.env.local`:

```
OMNIROUTE_URL=http://localhost:20128
OMNIROUTE_DRAFT_MODEL=auto
```

Keep existing OpenRouter vars in place — they're the fallback, not removed:

```
OPENROUTER_API_KEY=<existing, can be $0 balance, fallback only>
OPENROUTER_DRAFT_MODEL=<existing model, whatever it was>
```

Do NOT set `OMNIROUTE_URL` in Vercel production env, same reasoning as
`OLLAMA_URL` — this only runs from falcon, on the local network. Vercel cron,
if it ever tries to generate a draft without OmniRoute reachable, falls back
to OpenRouter (which will fail with 402 if there's truly $0 balance — see
"Open question" below).

## Part 3 — Make OpenRouter explicitly optional

### Step 3.1 — Startup validation update

Wherever pipeline startup logs which providers are configured (from the
earlier Ollama classifier spec's `logClassifierStartup` /
`assertClassifierConfigured` pattern), extend the same pattern for draft
generation:

```
[classifier] Ollama available at http://localhost:11434 (model: gemma3:4b)
[draft-generator] OmniRoute available at http://localhost:20128 (model: auto → gemini-3.1-pro)
[draft-generator] OpenRouter configured as fallback (balance not checked at startup)
```

If both `OLLAMA_URL` and `OMNIROUTE_URL` are set (the falcon-run case), the
pipeline should run end-to-end without ever touching OpenRouter. Confirm this
with one full run and check the provider mix in `pipeline_runs` shows 100%
`ollama` / 100% `omniroute`, zero `openrouter` calls.

### Step 3.2 — Documentation

Update `README.md` (or wherever setup docs live) to note:

- Local pipeline execution (falcon) requires: Ollama running, OmniRoute
  running, Supabase credentials. Does NOT require OpenRouter credit balance.
- OpenRouter API key is still needed as a configured fallback (the code path
  exists) but the account can sit at $0 balance indefinitely under normal
  operation.
- If running the pipeline from anywhere other than falcon (e.g. a future
  Vercel cron job), OpenRouter becomes load-bearing again since neither
  Ollama nor OmniRoute are reachable off the local network — see "Open
  question" below.

## Open question — not resolved in this spec

The pipeline's local-only architecture (both classification and draft
generation depending on falcon-resident services) means **the entire pipeline
can currently only run when falcon is on and both services are up.** This was
already true for classification after the earlier Ollama spec; it's now also
true for draft generation.

This is fine for current volume and workflow (you're manually or cron-triggering
`poll-all` from falcon), but worth flagging explicitly: if falcon is off,
asleep, or either service crashes, the pipeline does not run — there is no
cloud fallback anymore in practice, even though the code technically has one,
because the fallback (OpenRouter) needs actual funded credits to work.

Decide separately (not part of this spec) whether that's an acceptable
tradeoff long-term, or whether it's worth keeping a small OpenRouter balance
($5-10) purely as a break-glass option for when falcon is unavailable. Not
required to make a decision now — just flagging so it's a conscious choice.

## Files to create or modify

Create:
- `scripts/classifier-review-sample.ts`
- `lib/llm/providers/omniroute.ts`
- `lib/llm/draft-generator.ts`
- Migration for new `pipeline_runs` draft-provider columns (follow the
  numbering convention from the existing migrations, e.g. `0026_...`)

Modify:
- Wherever the draft-generation call site currently lives — swap to
  `generateDraft()`
- `.env.example` — document `OMNIROUTE_URL` and `OMNIROUTE_DRAFT_MODEL`
- `README.md` or setup docs — per Part 3.2
- Startup logging (wherever `logClassifierStartup` lives) — add the
  equivalent draft-generator startup log

Do NOT modify:
- The draft-generation prompt text itself (transport swap only)
- `lib/llm/providers/openrouter.ts` for draft generation (keep as-is, it's
  now the fallback)
- The classification prompt (already done in the prior spec — this pass only
  verifies it)

## Acceptance criteria

- [ ] `scripts/classifier-review-sample.ts` built and run; 30-signal manual review completed with a documented go/no-go decision on gemma3:4b
- [ ] `lib/llm/providers/omniroute.ts` exists, pure function, matches the OpenRouter adapter's input/output shape
- [ ] `lib/llm/draft-generator.ts` exists with the OmniRoute-first/OpenRouter-fallback pattern
- [ ] Draft-generation call site uses `generateDraft()` instead of calling OpenRouter directly
- [ ] `pipeline_runs` has new columns tracking draft-generation provider mix
- [ ] One full pipeline run (`npm run ingest:poll-all` or equivalent) completes end-to-end with zero OpenRouter calls logged, confirmed via `pipeline_runs`
- [ ] Startup logging shows both Ollama and OmniRoute as available, OpenRouter as configured-fallback
- [ ] `.env.example` and README updated
- [ ] Manually spot-check 2-3 real generated drafts from this run for quality (read the actual `idea_drops` rows produced) — confirm they're publishable quality, not just "the API call succeeded"

## Rollback plan

Both swaps are additive — the OpenRouter code paths are untouched, just no
longer the primary path. To roll back either:

- Classification: unset `OLLAMA_URL`, falls back to OpenRouter automatically
  (requires funded balance)
- Draft generation: unset `OMNIROUTE_URL`, falls back to OpenRouter
  automatically (requires funded balance)

No data migration risk — this only changes which service generates new
classifications/drafts going forward, doesn't touch existing rows.

## Notes for the implementer

- OmniRoute's response format matches OpenAI's chat completions shape
  (`choices[0].message.content`), confirmed via manual curl testing — the
  parsing logic can very likely be shared or copy-adapted from the
  OpenRouter adapter almost directly.
- Always send `"stream": false` explicitly to OmniRoute. Testing without it
  returned Server-Sent Events chunks instead of a single JSON response —
  the default streaming behavior will break naive JSON parsing if not set.
- OmniRoute's `model: "auto"` currently resolves to `gemini-3.1-pro` per the
  test, but "auto" implies it may route elsewhere depending on availability/
  rate limits. Log the actual `model` field from each response into
  `pipeline_runs` alongside the provider, so if draft quality ever dips you
  can check whether OmniRoute silently switched to a weaker backend.
- The Tailscale IP (100.97.72.115:20128) did not respond from falcon itself
  during testing — localhost did. Use `localhost:20128` in
  `OMNIROUTE_URL` since the pipeline runs on falcon. Don't use the Tailscale
  IP unless a future need arises to call OmniRoute from a different machine.
