import { slugify } from "@/lib/slugify";
import type { IdeaDrop } from "@/types/idea-drop";

export interface Facet {
  slug: string;
  label: string;
  count: number;
}

/** Nicer-cased labels for known evidence platforms — falls back to the raw value for anything unlisted. */
export const PLATFORM_LABELS: Record<string, string> = {
  reddit: "Reddit",
  g2: "G2",
  upwork: "Upwork",
  twitter: "Twitter",
  hackernews: "Hacker News",
  stackexchange: "StackExchange",
  github: "GitHub",
  devto: "Dev.to",
  lobsters: "Lobsters",
  gitlab: "GitLab",
  devrant: "devRant",
  youtube: "YouTube",
  codeberg: "Codeberg",
  discourse: "Discourse",
  mastodon: "Mastodon",
  bluesky: "Bluesky",
  other: "Other",
};

function buildFacets(values: string[], labelOverrides?: Record<string, string>): Facet[] {
  const bySlug = new Map<string, { label: string; count: number }>();
  for (const raw of values) {
    if (!raw) continue;
    const slug = slugify(raw);
    if (!slug) continue;
    const label = labelOverrides?.[raw] ?? raw;
    const existing = bySlug.get(slug);
    if (existing) existing.count += 1;
    else bySlug.set(slug, { label, count: 1 });
  }
  return Array.from(bySlug.entries())
    .map(([slug, { label, count }]) => ({ slug, label, count }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
}

function byNewest(a: IdeaDrop, b: IdeaDrop): number {
  return b.publishedAt.localeCompare(a.publishedAt);
}

export function categoryFacets(ideas: IdeaDrop[]): Facet[] {
  return buildFacets(ideas.map((i) => i.category));
}

export function ideasForCategorySlug(ideas: IdeaDrop[], slug: string): IdeaDrop[] {
  return ideas.filter((i) => slugify(i.category) === slug).sort(byNewest);
}

export function platformFacets(ideas: IdeaDrop[]): Facet[] {
  const values: string[] = [];
  for (const idea of ideas) for (const e of idea.evidence) values.push(e.platform);
  return buildFacets(values, PLATFORM_LABELS);
}

export function ideasForPlatformSlug(ideas: IdeaDrop[], slug: string): IdeaDrop[] {
  return ideas.filter((i) => i.evidence.some((e) => slugify(e.platform) === slug)).sort(byNewest);
}

export function stackFacets(ideas: IdeaDrop[]): Facet[] {
  const values: string[] = [];
  for (const idea of ideas) for (const s of idea.launchStack) values.push(s.tool);
  return buildFacets(values);
}

export function ideasForStackSlug(ideas: IdeaDrop[], slug: string): IdeaDrop[] {
  return ideas.filter((i) => i.launchStack.some((s) => slugify(s.tool) === slug)).sort(byNewest);
}

export function apiFacets(ideas: IdeaDrop[]): Facet[] {
  const values: string[] = [];
  for (const idea of ideas) for (const a of idea.matchedApis) values.push(a.name);
  return buildFacets(values);
}

export function ideasForApiSlug(ideas: IdeaDrop[], slug: string): IdeaDrop[] {
  return ideas.filter((i) => i.matchedApis.some((a) => slugify(a.name) === slug)).sort(byNewest);
}

export function labelForSlug(facets: Facet[], slug: string): string | null {
  return facets.find((f) => f.slug === slug)?.label ?? null;
}
