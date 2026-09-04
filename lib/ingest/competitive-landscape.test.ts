import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  checkCompetitiveLandscape,
  checkCompetitiveLandscapeFree,
  checkCompetitiveLandscapes,
} from "./competitive-landscape";

describe("competitive-landscape", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.restoreAllMocks();
  });

  it("uses OpenRouter with citations when OPENROUTER_API_KEY is configured and valid", async () => {
    process.env.OPENROUTER_API_KEY = "sk-or-test-key";

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [
          {
            message: {
              content: JSON.stringify({
                verdict: "partial_overlap",
                existing_solutions: [
                  {
                    name: "ExistingTool",
                    url: "https://github.com/test/existing-tool",
                    gap: "Only handles basic cases.",
                  },
                ],
                search_query_used: "fuzzer terminal",
              }),
              annotations: [
                {
                  type: "url_citation",
                  url_citation: { url: "https://github.com/test/existing-tool" },
                },
              ],
            },
          },
        ],
        usage: { total_tokens: 500 },
      }),
    });
    global.fetch = fetchMock;

    const { result, costUsd } = await checkCompetitiveLandscape("Terminal emulator fuzzer");

    expect(result.verdict).toBe("partial_overlap");
    expect(result.existingSolutions).toHaveLength(1);
    expect(result.existingSolutions[0].name).toBe("ExistingTool");
    expect(costUsd).toBeGreaterThan(0);
  });

  it("falls back to free search when OPENROUTER_API_KEY\is missing", async () => {
    delete process.env.OPENROUTER_API_KEY;
    process.env.GITHUB_TOKEN = "ghp_test";

    const fetchMock = vi.fn().mockImplementation(async (url) => {
      if (typeof url === "string" && url.includes("api.github.com")) {
        return {
          ok: true,
          json: async () => ({
            items: [
              {
                name: "vtfuzz",
                html_url: "https://github.com/test/vtfuzz",
                description: "Terminal fuzzer",
                stargazers_count: 42,
              },
            ],
          }),
        };
      }
      return { ok: false };
    });
    global.fetch = fetchMock;

    const { result, costUsd } = await checkCompetitiveLandscape("Terminal emulator fuzzer");

    expect(costUsd).toBe(0);
    expect(result.existingSolutions).toHaveLength(1);
    expect(result.existingSolutions[0].name).toBe("vtfuzz");
    expect(result.existingSolutions[0].url).toBe("https://github.com/test/vtfuzz");
    expect(result.verdict).toBe("partial_overlap");
  });

  it("falls back to free search when OpenRouter returns 402 Payment Required", async () => {
    process.env.OPENROUTER_API_KEY = "sk-or-exhausted-key";

    const fetchMock = vi.fn().mockImplementation(async (url) => {
      if (typeof url === "string" && url.includes("openrouter.ai")) {
        return {
          ok: false,
          status: 402,
          text: async () => "Insufficient credits",
        };
      }
      if (typeof url === "string" && url.includes("api.github.com")) {
        return {
          ok: true,
          json: async () => ({
            items: [
              {
                name: "terminal-tool",
                html_url: "https://github.com/test/terminal-tool",
                description: "Test tool",
                stargazers_count: 10,
              },
            ],
          }),
        };
      }
      return { ok: false };
    });
    global.fetch = fetchMock;

    const { result, costUsd } = await checkCompetitiveLandscape("Terminal crashes");

    expect(costUsd).toBe(0);
    expect(result.existingSolutions.length).toBeGreaterThan(0);
    expect(result.existingSolutions[0].url).toBe("https://github.com/test/terminal-tool");
  });

  it("returns no_direct_competitor when free search finds 0 candidate tools", async () => {
    delete process.env.OPENROUTER_API_KEY;

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ items: [] }),
    });
    global.fetch = fetchMock;

    const result = await checkCompetitiveLandscapeFree("Obscure niche non-existent hardware protocol");

    expect(result.verdict).toBe("no_direct_competitor");
    expect(result.existingSolutions).toEqual([]);
    expect(result.searchQueryUsed).toBeDefined();
    expect(result.checkedAt).toBeDefined();
  });

  it("enforces strict grounding when OmniRoute analyzes candidates", async () => {
    delete process.env.OPENROUTER_API_KEY;
    process.env.OMNIROUTE_URL = "http://localhost:20128";

    const fetchMock = vi.fn().mockImplementation(async (url) => {
      if (typeof url === "string" && url.includes("api.github.com")) {
        return {
          ok: true,
          json: async () => ({
            items: [
              {
                name: "real-repo",
                html_url: "https://github.com/test/real-repo",
                description: "A real repository",
                stargazers_count: 100,
              },
            ],
          }),
        };
      }
      if (typeof url === "string" && url.includes("localhost:20128")) {
        return {
          ok: true,
          json: async () => ({
            choices: [
              {
                message: {
                  content: JSON.stringify({
                    verdict: "partial_overlap",
                    existing_solutions: [
                      {
                        name: "real-repo",
                        url: "https://github.com/test/real-repo",
                        gap: "Covers some parts but not others.",
                      },
                      {
                        name: "hallucinated-tool",
                        url: "https://github.com/fake/hallucinated-tool",
                        gap: "Invented by LLM.",
                      },
                    ],
                  }),
                },
              },
            ],
          }),
        };
      }
      return { ok: false };
    });
    global.fetch = fetchMock;

    const result = await checkCompetitiveLandscapeFree("Real problem statement");

    expect(result.existingSolutions).toHaveLength(1);
    expect(result.existingSolutions[0].name).toBe("real-repo");
    expect(result.existingSolutions[0].url).toBe("https://github.com/test/real-repo");
    expect(result.verdict).toBe("partial_overlap");
  });

  it("handles batch checkCompetitiveLandscapes without throwing", async () => {
    delete process.env.OPENROUTER_API_KEY;

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ items: [] }),
    });
    global.fetch = fetchMock;

    const { results, stats } = await checkCompetitiveLandscapes([      { id: "idea-1", problemStatement: "Problem 1" },
      { id: "idea-2", problemStatement: "Problem 2" },
    ]);

    expect(results).toHaveLength(2);
    expect(stats.requested).toBe(2);
    expect(stats.checked).toBe(2);
    expect(stats.errors).toHaveLength(0);
  });
});