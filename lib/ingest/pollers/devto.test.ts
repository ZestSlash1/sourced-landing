import { describe, expect, it } from "vitest";
import { isRecurringThreadTitle } from "./devto";

describe("isRecurringThreadTitle", () => {
  it("flags known recurring weekly-thread titles", () => {
    expect(isRecurringThreadTitle("What was your win this week?")).toBe(true);
    expect(isRecurringThreadTitle("Meme Monday")).toBe(true);
  });

  it("matches case-insensitively and as a substring", () => {
    expect(isRecurringThreadTitle("WHAT WAS YOUR WIN THIS WEEK?")).toBe(true);
    expect(isRecurringThreadTitle("Weekly Thread: Meme Monday Edition #42")).toBe(true);
  });

  it("does not flag genuine complaint-style titles", () => {
    expect(isRecurringThreadTitle("Why does every CI pipeline take 20 minutes?")).toBe(false);
    expect(isRecurringThreadTitle("I'm frustrated with our deploy process")).toBe(false);
  });
});
