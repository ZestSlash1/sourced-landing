import { describe, expect, it } from "vitest";
import { validateEvidence } from "./validate-evidence";
import type { Evidence } from "@/types/idea-drop";

const recent = () => new Date().toISOString();
const daysAgo = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString();
};

function evidence(overrides: Partial<Evidence> = {}): Evidence {
  return {
    platform: "reddit",
    quote: "This is annoying and I'd pay to fix it",
    url: "https://reddit.com/r/example/1",
    date: recent(),
    ...overrides,
  };
}

describe("validateEvidence", () => {
  it("passes with 3+ items across 2+ platforms with a recent one", () => {
    const result = validateEvidence([
      evidence({ platform: "reddit" }),
      evidence({ platform: "g2" }),
      evidence({ platform: "upwork" }),
    ]);
    expect(result).toEqual({ valid: true, errors: [] });
  });

  it("rejects fewer than 3 evidence items", () => {
    const result = validateEvidence([
      evidence({ platform: "reddit" }),
      evidence({ platform: "g2" }),
    ]);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain("Only 2 evidence item(s) — minimum 3 required");
  });

  it("rejects evidence all from a single platform", () => {
    const result = validateEvidence([
      evidence({ platform: "reddit" }),
      evidence({ platform: "reddit" }),
      evidence({ platform: "reddit" }),
    ]);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain("Evidence spans only 1 platform(s) — minimum 2 required");
  });

  it("rejects evidence that is all older than 90 days", () => {
    const result = validateEvidence([
      evidence({ platform: "reddit", date: daysAgo(200) }),
      evidence({ platform: "g2", date: daysAgo(150) }),
      evidence({ platform: "upwork", date: daysAgo(100) }),
    ]);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain("No evidence dated within the last 90 days");
  });
});
