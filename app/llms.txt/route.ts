import { SITE_URL } from "@/lib/seo";

export const dynamic = "force-static";

export function GET() {
  const body = `# Sourced

> Real complaints, triangulated across platforms into evidence-backed build briefs for Claude Code, Cursor, v0, and other AI coding tools.

Sourced ingests real complaints from Hacker News, StackExchange, GitHub Issues, Dev.to, and Lobsters, clusters them by semantic similarity, and only surfaces a problem once 3+ independent people describe the same pain — no generated ideas, no vibes.

## Key pages

- [Home](${SITE_URL}/): product overview, pricing, and how the pipeline works.
- [Feed](${SITE_URL}/feed): the current set of validated startup ideas.
- [Methodology](${SITE_URL}/methodology): sources, filtering bar, and live pipeline numbers.
- [Rejected clusters](${SITE_URL}/rejected): every cluster that didn't clear the bar, shown in full for transparency.

## Notes for agents

- Each idea in the feed links to a full build brief page at /feed/{slug} with problem summary, evidence, matched APIs, and an MVP scope.
- Content is server-rendered; no JavaScript execution is required to read problem/evidence text.
`;
  return new Response(body, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
