import { afterEach, describe, expect, it, vi } from "vitest";
import { generateAgentPrompts } from "./generate-agent-prompts";

const IDEA = {
  title: "Example idea",
  problem: { summary: "A problem", whoFeelsIt: "Someone" },
  buildBrief: {
    coreLoop: ["step1"],
    mvpScope: ["scope1"],
    explicitlyCut: ["cut1"],
    dataModel: [{ name: "User", fields: "id, email" }],
  },
  matchedApis: [],
  launchStack: [],
};

describe("generateAgentPrompts", () => {
  const originalKey = process.env.ANTHROPIC_API_KEY;

  afterEach(() => {
    vi.unstubAllGlobals();
    process.env.ANTHROPIC_API_KEY = originalKey;
  });

  it("makes a single LLM call and returns all three variants as structured JSON", async () => {
    process.env.ANTHROPIC_API_KEY = "test-key";
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        content: [
          {
            type: "text",
            text: JSON.stringify({
              claudeCode: "a".repeat(500),
              cursorWindsurf: "b".repeat(100),
              v0Bolt: "c".repeat(100),
            }),
          },
        ],
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await generateAgentPrompts(IDEA);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(result.claudeCode.length).toBeGreaterThan(result.v0Bolt.length);
    expect(result.claudeCode).not.toBe(result.cursorWindsurf);
    expect(result.cursorWindsurf).not.toBe(result.v0Bolt);
  });

  it("throws when ANTHROPIC_API_KEY is missing", async () => {
    delete process.env.ANTHROPIC_API_KEY;
    await expect(generateAgentPrompts(IDEA)).rejects.toThrow("ANTHROPIC_API_KEY");
  });
});
