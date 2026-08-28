# Ticket 04 — public-apis sync script

## Goal
A structured, queryable JSON file of every API in the [public-apis](https://github.com/public-apis/public-apis) directory, refreshed on a schedule, that Stage 2 idea-structuring can filter by category to populate `matched_apis` on each idea card.

## Source data
`https://raw.githubusercontent.com/public-apis/public-apis/master/README.md`

The README is a single markdown file. Each category is an `###` (or `##`, verify against the current file — headers have shifted between repo versions) heading, followed by a markdown table:

```
### Finance

| API | Description | Auth | HTTPS | CORS |
|---|---|---|---|---|
| [Alpha Vantage](https://www.alphavantage.co/) | Realtime and historical stock data | `apiKey` | Yes | Unknown |
| ...
```

## Scope

### 1. Fetch + parse script
- `scripts/sync-public-apis.ts` (or `.py`, match whatever the rest of the pipeline is written in)
- Fetch the raw README from the URL above (no auth needed, it's a public raw file)
- Parse into a flat array of entries:
```ts
type ApiEntry = {
  name: string;
  url: string;          // the API's own link, extracted from the markdown link
  description: string;
  category: string;     // the heading this table was under
  auth: string;         // e.g. "apiKey", "OAuth", "No"
  https: boolean;
  cors: string;         // "Yes" | "No" | "Unknown" — keep as string, source data is inconsistent here
};
```
- Markdown table parsing: split on `|`, trim cells, skip the header-separator row (`|---|---|...`). Extract `name` and `url` from the `[text](url)` link syntax in the first column — a simple regex (`/\[(.+?)\]\((.+?)\)/`) is sufficient, this doesn't need a full markdown parser.
- Write the result to `data/public-apis.json` (or directly to a `apis` table if the pipeline already has a database — a flat JSON file is fine for launch volume, move to a DB table only once idea-matching needs to query it relationally)

### 2. Category normalization
The repo's category names (e.g. "Open Data", "Documents & Productivity") won't exactly match the category tags your idea-structuring prompt outputs (e.g. "Micro-SaaS", "AI Wrapper" — those are build-type categories, not API-domain categories, so there's no 1:1 mapping). Handle this at match time, not sync time:
- Sync script's job: store the source data faithfully, don't try to reshape it
- A separate small mapping table (hand-written, ~20-30 lines) maps your idea categories/keywords to relevant public-apis category names — e.g. an idea tagged with "invoicing" or "currency" pulls from the `Finance` category; "PDF" or "documents" pulls from `Documents & Productivity`. This mapping is a judgment call worth doing by hand rather than trying to make the sync script smart about it.

### 3. Schedule
- Vercel Cron (`vercel.json` → `crons` array) or a GitHub Action on a weekly schedule — either is fine, Vercel Cron is simpler if the app's already on Vercel
- Idempotent: re-running just overwrites `data/public-apis.json` with the current snapshot, no dedup logic needed since it's a full replace each run

### 4. Failure handling
- If the fetch fails (network error, GitHub down, README restructured in a way the parser chokes on) — log the error clearly and **keep the previous `data/public-apis.json` in place** rather than overwriting it with a partial/empty result. A stale-but-correct API list is much better than a broken one.
- Optional but recommended: a sanity check after parsing — if the resulting entry count is wildly lower than the previous run (e.g. drops by more than 50%), treat that as a parse failure and keep the old file, since it likely means the README's structure changed and the parser needs updating rather than the directory actually shrinking.

## Out of scope for this ticket
- The idea-category → API-category mapping table (small, separate, hand-authored — do after this ticket, using the real category list this script produces)
- Any UI for browsing the API list directly (not part of the product, this is backend data only)
- Rate-limit/pricing detail beyond what's in the source README (the README doesn't include live pricing, just auth type and HTTPS/CORS flags — don't invent numbers, if it's not in the source data, mark it "check docs" in the build brief rather than guessing)

## Acceptance criteria
- [ ] Running the script produces `data/public-apis.json` with several hundred entries across dozens of categories
- [ ] Each entry has `name`, `url`, `description`, `category`, `auth`, `https`, `cors`
- [ ] A deliberately broken/unreachable fetch leaves the previous file untouched and logs an error
- [ ] The script runs cleanly on a schedule without manual intervention
- [ ] Spot-check 5-10 entries against the live README to confirm parsing accuracy (link URLs correct, category assignment correct, no truncated descriptions)

## Test notes
The README is a few thousand lines — after the first successful run, diff the entry count against a manual `grep -c` of table rows in the source file as a basic correctness check.
