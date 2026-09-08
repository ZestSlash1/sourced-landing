import { describe, it, expect, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { getSourceTallies } from "@/lib/ingest/pipeline-stats";

vi.mock("@/lib/ingest/raw-signals-repository", () => ({
  listAllSignalSummaries: vi.fn().mockResolvedValue([
    { id: "1", source: "hackernews" },
    { id: "2", source: "hackernews" },
    { id: "3", source: "github" },
    { id: "4", source: "stackexchange" },
    { id: "5", source: "devto" },
    { id: "6", source: "lobsters" },
    { id: "7", source: "other" },
  ]),
}));

vi.mock("@/lib/supabase/server", () => ({
  getSupabaseServerClient: vi.fn().mockReturnValue({
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ count: 10, error: null }),
      }),
    }),
  }),
}));

describe("getSourceTallies", () => {
  it("computes counts for primary pipeline sources", async () => {
    const tallies = await getSourceTallies();
    expect(tallies.hackernews).toBe(2);
    expect(tallies.github).toBe(1);
    expect(tallies.stackexchange).toBe(1);
    expect(tallies.devto).toBe(1);
    expect(tallies.lobsters).toBe(1);
  });
});
