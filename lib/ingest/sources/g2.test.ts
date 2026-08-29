import { describe, expect, it } from "vitest";
import { parseG2Csv } from "./g2";

describe("parseG2Csv", () => {
  it("parses rows into RawComplaint entries", () => {
    const csv = [
      "reviewText,url,date,rating",
      "Export is clunky and slow,https://g2.com/r/1,2026-08-01,2",
    ].join("\n");

    const result = parseG2Csv(csv, "SomeTool");

    expect(result).toEqual([
      {
        platform: "g2",
        subforum: "SomeTool",
        rawText: "Export is clunky and slow",
        url: "https://g2.com/r/1",
        date: "2026-08-01",
        engagementRaw: { type: "review_rating", value: 2 },
      },
    ]);
  });
});
