# Sourced — Phase 2 Build Spec: Ingest → Prompts → Billing → First Live Drop

Hand this to Claude Code as-is. Builds on `sourced-idea-drop-spec.md` (types,
tier gating, evidence validation — assumed already implemented and passing
its acceptance checks). Do the phases in order; each one depends on the
previous.

---

## Phase 1 — Sourcing / Ingest Pipeline

**Goal:** turn a raw complaint (Reddit thread, G2 review, Upwork post) into a
valid `Evidence` object, and group related evidence into a draft `IdeaDrop`.

### Task 1.1 — Source connectors

Create `lib/ingest/sources/` with one file per platform:
- `reddit.ts` — fetch threads from target subreddits (use Reddit's public
  JSON API, e.g. `https://www.reddit.com/r/{sub}/top.json?t=month`; no auth
  needed for read-only public listing endpoints)
- `g2.ts` — G2 has no public API; stub this as a manual/CSV-import path for
  now (ask the user whether they want scraping — flag the ToS risk rather
  than building it silently)
- `upwork.ts` — Upwork's public job feed requires an API key; stub with a
  clear `TODO: requires Upwork API credentials` and a manual-paste fallback

Each connector exports a function returning `RawComplaint[]`:

```typescript
export interface RawComplaint {
  platform: Evidence["platform"];
  subforum?: string;
  rawText: string;
  url: string;
  date: string;
  engagementRaw?: { type: string; value: number };
}
```

### Task 1.2 — Complaint → Evidence transformer

Create `lib/ingest/to-evidence.ts`. This is where an LLM call (via the
Anthropic API, same pattern as elsewhere in this app) turns `rawText` into a
clean `quote` (paraphrased, under ~200 chars) and classifies whether the
complaint is substantive enough to count as evidence at all — reject rants
with no concrete problem, meme threads, etc.

```typescript
export async function toEvidence(raw: RawComplaint): Promise<Evidence | null> {
  // Call LLM: "Does this text describe a genuine, specific problem someone
  // would pay to solve? If yes, return a paraphrased quote under 200 chars
  // and a one-line problem summary. If no, return null."
  // Never pass rawText through as a verbatim quote longer than ~15 words —
  // paraphrase for both copyright and consistency reasons.
}
```

### Task 1.3 — Clustering into draft IdeaDrops

Create `lib/ingest/cluster-evidence.ts`. Group `Evidence[]` items that
describe the same underlying problem (LLM call: given a batch of evidence
summaries, cluster into groups; each group with 2+ items becomes a candidate
draft). This is intentionally loose — false positives are fine, since
`validateEvidence` (already built) will hard-reject anything under-evidenced
downstream.

Output: for each cluster, create an `IdeaDrop` with `status: "draft"`,
`evidence` populated, and every other field empty/placeholder — the human (or
a separate LLM pass) fills in `problem`, `whyNow`, `buildBrief`, etc. Do not
auto-generate `buildBrief` in this phase; that's a deliberate scope cut so a
human reviews problem-framing before build guidance gets attached.

### Task 1.4 — Ingest CLI/route

Wire Tasks 1.1–1.3 into a single entry point — either a script
(`scripts/ingest.ts`, run manually or via cron) or an admin-triggered API
route. Ask the user which they prefer if not obvious from the existing repo
structure. Output: N draft `IdeaDrop`s written to the DB, visible in whatever
admin/authoring view exists (per the earlier spec's Task 3, step 4).

**Acceptance check:** running ingest against a real subreddit produces at
least one draft `IdeaDrop` with 2+ `Evidence` items with real URLs, real
dates, and paraphrased (not verbatim) quotes.

---

## Phase 2 — Agent-Specific Prompt Generator

**Goal:** given a completed `buildBrief`, generate the three
`agentPrompts` variants automatically instead of hand-writing each one.

### Task 2.1 — Prompt templates

Create `lib/prompts/generate-agent-prompts.ts`:

```typescript
export async function generateAgentPrompts(
  idea: Pick<IdeaDrop, "title" | "problem" | "buildBrief" | "matchedApis" | "launchStack">
): Promise<IdeaDrop["agentPrompts"]> {
  // One LLM call per variant, OR one call producing all three as structured
  // JSON output (cheaper — prefer this). System prompt should encode:
  //
  // claudeCode: full spec-style prompt — problem statement, core loop, data
  //   model, explicit scope cuts, matched APIs with purpose, launch stack.
  //   Written as something pasteable into a CLAUDE.md or an /init-style
  //   kickoff message. Can be long (400-800 words).
  //
  // cursorWindsurf: same content, compressed to ~150-250 words — these
  //   tools work better with tighter context, front-load the core loop and
  //   data model, trim rationale/why-now framing.
  //
  // v0Bolt: UI-scaffold-first — describe screens/components and layout
  //   before business logic. These tools generate UI fastest when given
  //   visual/structural description up front.
}
```

Use the **structured JSON output** pattern already established for AI-powered
Artifacts in this codebase (system prompt instructs "return only JSON, no
preamble") so the three variants come back in one call as
`{ claudeCode: string, cursorWindsurf: string, v0Bolt: string }`.

### Task 2.2 — Regeneration trigger

Wire this to run automatically whenever `buildBrief` is edited and saved on a
draft idea (not on every save — only when `buildBrief` fields actually
changed, to avoid burning API calls on unrelated edits). A manual
"regenerate prompts" button in the admin view is also fine as a fallback if
the auto-trigger is complex to wire into the existing save path.

**Acceptance check:** editing a `buildBrief` and saving produces three
non-empty, meaningfully different prompt strings (Claude Code version should
be visibly longer/more structured than the v0/Bolt version).

---

## Phase 3 — Razorpay Tier Wiring

**Goal:** replace the placeholder `userTier` string in `scopeToTier` with
real subscription state.

### Task 3.1 — Subscription state on the user record

Confirm (ask the user if unclear) whether user/subscription data already
exists in the DB from earlier Razorpay setup. If not, the user record needs
at minimum: `razorpaySubscriptionId`, `tier` (`"free" | "builder" | "studio"`),
`tierExpiresAt` or `tierRenewsAt`, `status` (`"active" | "past_due" |
"cancelled"`).

### Task 3.2 — Webhook handler

Create/confirm `app/api/webhooks/razorpay/route.ts` handling at minimum:
- `subscription.activated` / `subscription.charged` → set `tier` from the
  plan ID, `status: "active"`
- `subscription.halted` / `subscription.cancelled` → set `status` accordingly
  — **do not immediately drop `tier` to `"free"`** on `past_due`; give a grace
  period (check with the user what grace period they want, default to 3
  days) before downgrading, to avoid punishing a failed card charge instantly
- Verify webhook signature per Razorpay's documented HMAC scheme before
  processing any payload — never trust an unverified webhook body

### Task 3.3 — Read path

Update wherever `userTier` is currently sourced (session, request context,
etc.) to read `status === "active" ? tier : "free"` — a lapsed subscription
falls back to free-tier access, not an error state.

### Task 3.4 — Wire into scopeToTier call sites

Confirm every call site of `scopeToTier` (from the earlier spec) now passes
real tier data, not a hardcoded/placeholder value.

**Acceptance check:** a test subscription activation via Razorpay's test mode
correctly flips a user from `free` to `builder` and unlocks a `builder`-tier
idea's full payload on next request; a simulated `subscription.cancelled`
correctly reverts access after the grace period (or immediately, per
whatever the user decides in 3.2).

---

## Phase 4 — First Real Idea Drop, End to End

**Goal:** prove the full pipeline with one real idea, published and gated
correctly, before treating any of the above as done.

### Steps (manual + verification, not new code unless something breaks)

1. Run ingest (Phase 1) against a real source, get at least one draft.
2. Human fills in `problem`, `whyNow`, `buildBrief`, `matchedApis`,
   `launchStack` for that draft (this stays manual for now — flag to the
   user whether they want this LLM-assisted later, but don't build that in
   this phase).
3. Save → confirm agent prompts (Phase 2) generate correctly.
4. Attempt to set `status: "published"` — confirm evidence validation
   (already built) either passes cleanly or correctly blocks with specific
   errors.
5. Once published, hit `/api/ideas` as a `free`-tier test user — confirm
   teaser shape, gated fields absent.
6. Hit the same route as a `builder`-tier test user (use Phase 3's real
   subscription flow in Razorpay test mode) — confirm full payload.
7. Render both states in the actual masonry UI — confirm the locked-card
   treatment and full-card treatment both look correct, not just that the
   API response is right.

**This phase has no separate acceptance checklist — it IS the acceptance
check for phases 1-3 combined.** If any step fails, fix the relevant phase's
code rather than patching around it here.

---

## Suggested order of execution for Claude Code

Phase 1 → Phase 2 → Phase 3 can happen in parallel if using subagents /
separate sessions, since they don't share files. Phase 4 must come last and
must be run against the real, integrated codebase — not a mocked version of
any of the three.
