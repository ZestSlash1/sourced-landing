# Sourced — Classification Prompt Tightening Spec

## Context

Ran the Ollama classifier parity script (`scripts/classifier-parity.ts`) against
50 previously-OpenRouter-classified signals, comparing OpenRouter's classification
to gemma3:4b and qwen2.5:7b-instruct running locally via Ollama.

Results:
- gemma3:4b: 82.0% isComplaint agreement, 72.2% domain agreement, 8.3% problem
  statement similarity — all below target (90% / 80% / n/a)
- qwen2.5:7b-instruct: 46.0% isComplaint agreement — worse, ruled out

Manually inspected 3 of gemma3:4b's mismatches (all cases where OpenRouter said
`true` and gemma3:4b said `false`). All three are GitHub/GitLab issue-tracker
posts that are NOT organic user complaints:

1. A GitLab internal discussion between contributors about renaming `Coverage`
   to `TestCoverage` for clarity — an engineering naming debate, not a complaint.
2. A GitHub feature request suggesting PostGIS support — a "would be nice"
   suggestion, no frustration expressed.
3. A Stack Exchange post asking for UI design advice on a legacy app — mild
   frustration at most, framed as "please give me suggestions," not "this is
   broken."

OpenRouter (the stronger model) is stretching its definition of "complaint" to
include these. gemma3:4b applies a stricter, more literal reading and says no.
Given that GitHub and GitLab are structurally issue trackers — full of formal
feature requests and maintainer discussion, not organic venting — this ambiguity
is baked into the pipeline regardless of which model classifies. The current
prompt does not disambiguate "complaint" from "feature request" or "internal
engineering discussion," so both providers are guessing at an implicit boundary
that isn't written down anywhere.

## Goal

Tighten the classification prompt's definition of "complaint" so it explicitly
excludes formal feature requests and maintainer-to-maintainer discussion unless
genuine user frustration or a blocking problem is present. This should make
OpenRouter's labeling more consistent (less over-inclusive) and, if the
disagreement really was mostly about this ambiguity, should raise gemma3:4b's
agreement with OpenRouter substantially — because both providers will be
applying the same tighter definition rather than gemma3:4b's stricter default
guess fighting OpenRouter's looser default guess.

## Non-goals

- Changing the embedding pipeline, clustering threshold, or publish gate
- Changing which sources are polled
- Rewriting the classifier architecture (classify(), the Ollama/OpenRouter
  adapters) — this is a prompt-text-only change

## The change

Locate the classification prompt. It lives in whichever file constructs the
prompt string sent to both providers — check `lib/llm/providers/shared.ts`
first (per the earlier Ollama swap work, this is where shared prompt-building
logic was consolidated), otherwise search for the existing prompt text
containing "isComplaint" or "You are a classifier."

Current prompt shape (paraphrased from the Ollama classification spec):

```
You are a classifier. Given a developer forum post, return ONLY valid JSON
matching this exact schema, with no prose before or after:

{
  "isComplaint": boolean,
  "problemStatement": string | null,
  "domain": string | null,
  "confidence": number
}
```

### New prompt text

Replace the bare `isComplaint` field description with an explicit definition
and worked examples. Something close to this (adjust wording to match house
style, keep the JSON schema exactly the same):

```
You are a classifier. Given a forum/issue-tracker post, return ONLY valid JSON
matching this exact schema, with no prose before or after:

{
  "isComplaint": boolean,
  "problemStatement": string | null,
  "domain": string | null,
  "confidence": number
}

Definition of "complaint" (isComplaint: true):
A complaint means the poster is stuck, frustrated, or actively affected by
something not working the way they need it to — right now, for them personally.
This includes: bugs blocking their work, missing functionality they need
urgently, workarounds they're forced into, or explicit frustration/annoyance.

Do NOT mark as a complaint (isComplaint: false):
- A formal feature request or "would be nice" suggestion with no stated urgency
  or frustration (e.g. "we should think about adding X support")
- Internal maintainer-to-maintainer discussion about naming, code style, or
  implementation details (e.g. GitHub/GitLab issue threads between contributors
  debating how to structure something)
- A neutral request for advice, opinions, or suggestions where the poster isn't
  blocked or upset (e.g. "any suggestions on how to improve the look of X?")
- General discussion, announcements, or questions with no unmet need expressed

Examples:
- "We should think about adding PostGIS support" → isComplaint: false
  (feature suggestion, no stated urgency)
- "I can't query geolocation data without writing raw SQL, this is really
  slowing me down" → isComplaint: true (blocked, frustrated)
- "Should this be renamed to TestCoverage for clarity?" → isComplaint: false
  (internal naming discussion)
- "I'd appreciate any suggestions on what changes would make the app look
  better" → isComplaint: false (neutral advice request, not blocked or upset)
- "I've spent 3 hours trying to get X working and nothing in the docs explains
  how" → isComplaint: true (frustration + blocked)

If isComplaint is false, problemStatement and domain should be null.
```

Keep the rest of the prompt (platform, title, body injection) unchanged.

## Files to modify

- Wherever the shared prompt template lives (`lib/llm/providers/shared.ts` or
  equivalent — confirm exact location before editing)
- If the prompt is duplicated between `ollama.ts` and `openrouter.ts` instead
  of shared, update BOTH so they stay identical. This is important: parity
  testing only means something if both providers see the exact same prompt.

## Testing

1. Re-run the parity script with the new prompt, gemma3:4b as
   `OLLAMA_CLASSIFIER_MODEL`:
   ```
   npm run ingest:classifier-parity
   ```
2. Compare against the previous baseline (82.0% / 72.2% / 8.3%). Expect
   `isComplaint` agreement to rise meaningfully since the ambiguous middle
   ground (issue-tracker feature requests, naming discussions) should now
   resolve the same way for both providers.
3. If agreement clears 90% / 80%, gemma3:4b is the classifier — update
   `.env.local` (`OLLAMA_CLASSIFIER_MODEL=gemma3:4b`) and treat this as done.
4. If gemma3:4b still falls short, retest qwen2.5:7b-instruct with the new
   prompt too (its 46% baseline was mostly the same false-negative pattern
   on GitHub/GitLab issues, so it should also improve, possibly more).
5. If NEITHER clears the bar after this prompt fix, that's a real signal
   gemma3:4b/qwen2.5:7b-instruct genuinely lack the reasoning capacity for
   this task at their size, and a step up in model size (or keeping OpenRouter
   as primary for classification, dropping local-only ambitions) becomes the
   honest conclusion — don't keep prompt-tuning indefinitely chasing the bar.

## Note on domain agreement (separate issue, do not fix in this pass)

The domain field showed scattered disagreement even where isComplaint agreed
(e.g. "Dev Tools" vs "B2B SaaS/CRM" vs "Freelance & Client Tools" for what look
like similar signals). This is a different problem: the domain field is
free-text with no constrained enum, so any model will invent slightly different
labels each time. Do NOT attempt to fix this in the same pass as the complaint
definition — it's a separate, likely larger change (constraining domain to a
fixed list of allowed values, probably derived from your existing distinct
domain values in the `raw_signals` table). File as a follow-up if the complaint
fix alone doesn't get domain agreement over 80% naturally.

## Acceptance criteria

- [ ] Prompt text updated with explicit complaint definition + exclusions + examples
- [ ] Both Ollama and OpenRouter adapters send the identical updated prompt (verify by diffing the two files' prompt-construction code)
- [ ] JSON schema in the prompt is unchanged (isComplaint, problemStatement, domain, confidence — same shape)
- [ ] Parity script re-run against gemma3:4b with new prompt, results logged
- [ ] If gemma3:4b clears 90%/80%, `.env.local` updated and documented as the locked-in classifier model
- [ ] If not, qwen2.5:7b-instruct re-tested with new prompt before declaring local classification not viable at this model size
