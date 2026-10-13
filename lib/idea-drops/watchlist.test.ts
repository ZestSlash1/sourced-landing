import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Evidence } from "@/types/idea-drop";

vi.mock("server-only", () => ({}));
const { from, query } = vi.hoisted(() => {
  const query: Record<string, any> = {};
  for (const name of ["select", "eq", "upsert", "delete"]) query[name] = vi.fn(() => query);
  query.then = (resolve: (value: unknown) => unknown) => Promise.resolve({ data: [], error: null }).then(resolve);
  return { query, from: vi.fn(() => query) };
});
vi.mock("@/lib/supabase/server", () => ({ getSupabaseServerClient: () => ({ from }) }));
import { evidenceFingerprint, listOpportunityWatches, removeOpportunityWatch, saveOpportunityWatch } from "./watchlist";
import { evidenceSummary } from "./evidence-summary";

const evidence: Evidence[] = [{ platform: "github", date: "2026-10-01", quote: "A real workflow problem", url: "https://github.com/org/repo/issues/1" }];
beforeEach(() => vi.clearAllMocks());
describe("evidence comparison", () => {
  it("ignores order, duplicate records, and tracking parameters, but notices actual evidence changes", () => {
    const other = { ...evidence[0], url: "https://github.com/org/repo/issues/2" };
    expect(evidenceFingerprint([...evidence, other])).toBe(evidenceFingerprint([other, ...evidence, ...evidence]));
    expect(evidenceFingerprint(evidence)).toBe(evidenceFingerprint([{ ...evidence[0], url: `${evidence[0].url}?utm_source=test` }]));
    expect(evidenceFingerprint(evidence)).not.toBe(evidenceFingerprint([{ ...evidence[0], quote: "Revised problem" }]));
  });
  it("counts repeated URLs without declaring distinct URLs independent", () => {
    expect(evidenceSummary([...evidence, { ...evidence[0], url: `${evidence[0].url}/?utm_source=test` }])).toMatchObject({ entries: 2, uniqueUrls: 1, repeatedUrls: 1 });
    expect(evidenceSummary([])).toMatchObject({ earliest: null, latest: null });
  });
  it("preserves review fragments and issue query IDs", () => {
    const urls = ["https://itunes.apple.com/review#review-1", "https://itunes.apple.com/review#review-2", "https://news.ycombinator.com/item?id=1", "https://news.ycombinator.com/item?id=2"];
    expect(evidenceSummary(urls.map((url) => ({ ...evidence[0], url }))).uniqueUrls).toBe(4);
  });
});
describe("durable shortlist", () => {
  it("reads and deletes only the authenticated account's state", async () => {
    await listOpportunityWatches("user-a");
    expect(from).toHaveBeenCalledWith("events");
    expect(query.eq).toHaveBeenCalledWith("event_type", "opportunity_watch");
    expect(query.eq).toHaveBeenCalledWith("user_id", "user-a");
    await removeOpportunityWatch("user-a", "idea-1");
    expect(query.delete).toHaveBeenCalled();
    expect(query.eq).toHaveBeenCalledWith("user_id", "user-a");
  });
  it("upserts one deterministic row per user and opportunity", async () => {
    await saveOpportunityWatch("user-a", "idea-1", evidence, "sid-a");
    await saveOpportunityWatch("user-a", "idea-1", evidence, "sid-a");
    await saveOpportunityWatch("user-b", "idea-1", evidence, "sid-b");
    const [first, second, third] = query.upsert.mock.calls.map((args: any[]) => args[0]);
    expect(first.id).toBe(second.id);
    expect(third.id).not.toBe(first.id);
    expect(first.metadata.evidenceFingerprint).toBe(evidenceFingerprint(evidence));
    expect(query.upsert.mock.calls[0][1]).toEqual({ onConflict: "id" });
  });
  it("surfaces write failures instead of claiming success", async () => {
    query.upsert.mockResolvedValueOnce({ error: { message: "database offline" } });
    await expect(saveOpportunityWatch("user-a", "idea-1", evidence, "sid-a")).rejects.toThrow("database offline");
  });
});
