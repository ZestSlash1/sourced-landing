import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const listPublishedSlugsForSitemapMock = vi.fn();
const listPublishedIdeasMock = vi.fn();

vi.mock("@/lib/idea-drops/repository", () => ({
  listPublishedSlugsForSitemap: () => listPublishedSlugsForSitemapMock(),
  listPublishedIdeas: () => listPublishedIdeasMock(),
}));

import sitemap from "./sitemap";

describe("sitemap", () => {
  it("generates core static pages and facet pages", async () => {
    listPublishedSlugsForSitemapMock.mockResolvedValue([
      { slug: "idea-1", updatedAt: "2026-09-01T00:00:00.000Z" },
    ]);
    listPublishedIdeasMock.mockResolvedValue([
      {
        id: "idea-1",
        slug: "idea-1",
        category: "Micro-SaaS",
        evidence: [{ platform: "hackernews" }],
        launchStack: [{ tool: "Next.js" }],
        matchedApis: [{ name: "Stripe" }],
      },
    ]);

    const entries = await sitemap();
    const urls = entries.map((e) => e.url);

    expect(urls).toContain("https://www.getsourced.dev/");
    expect(urls).toContain("https://www.getsourced.dev/feed");
    expect(urls).toContain("https://www.getsourced.dev/methodology");
    expect(urls).toContain("https://www.getsourced.dev/rejected");
    expect(urls).toContain("https://www.getsourced.dev/category");
    expect(urls).toContain("https://www.getsourced.dev/feed/idea-1");
    expect(urls).toContain("https://www.getsourced.dev/category/micro-saas");
    expect(urls).toContain("https://www.getsourced.dev/platform/hackernews");
    expect(urls).toContain("https://www.getsourced.dev/stack/next-js");
    expect(urls).toContain("https://www.getsourced.dev/tools/stripe");
    expect(urls).toContain("https://www.getsourced.dev/signals");
  });
});
