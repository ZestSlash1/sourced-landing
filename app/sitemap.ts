import type { MetadataRoute } from "next";
import { listPublishedIdeas, listPublishedSlugsForSitemap } from "@/lib/idea-drops/repository";
import { categoryFacets, platformFacets, stackFacets, apiFacets } from "@/lib/idea-drops/facets";
import { absoluteUrl } from "@/lib/seo";

/**
 * How many /signals pagination pages are worth submitting for crawling —
 * deeper pages stay crawlable via rel=next/prev but aren't in the sitemap,
 * per the spec's "avoid submitting hundreds of thin pagination pages" note.
 */
const SIGNALS_SITEMAP_PAGES = 5;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [briefs, ideas] = await Promise.all([listPublishedSlugsForSitemap(), listPublishedIdeas()]);

  const categoryEntries = categoryFacets(ideas).map((f) => ({
    url: absoluteUrl(`/category/${f.slug}`),
    changeFrequency: "daily" as const,
    priority: 0.6,
  }));
  const platformEntries = platformFacets(ideas).map((f) => ({
    url: absoluteUrl(`/platform/${f.slug}`),
    changeFrequency: "daily" as const,
    priority: 0.5,
  }));
  const stackEntries = stackFacets(ideas).map((f) => ({
    url: absoluteUrl(`/stack/${f.slug}`),
    changeFrequency: "weekly" as const,
    priority: 0.4,
  }));
  const apiEntries = apiFacets(ideas).map((f) => ({
    url: absoluteUrl(`/tools/${f.slug}`),
    changeFrequency: "weekly" as const,
    priority: 0.5,
  }));
  const signalsEntries = Array.from({ length: SIGNALS_SITEMAP_PAGES }, (_, i) => ({
    url: i === 0 ? absoluteUrl("/signals") : absoluteUrl(`/signals?page=${i + 1}`),
    changeFrequency: "daily" as const,
    priority: i === 0 ? 0.5 : 0.2,
  }));

  return [
    { url: absoluteUrl("/"), changeFrequency: "weekly", priority: 1 },
    { url: absoluteUrl("/feed"), changeFrequency: "daily", priority: 0.8 },
    { url: absoluteUrl("/methodology"), changeFrequency: "weekly", priority: 0.5 },
    { url: absoluteUrl("/rejected"), changeFrequency: "daily", priority: 0.3 },
    { url: absoluteUrl("/category"), changeFrequency: "weekly", priority: 0.6 },
    ...briefs.map((brief) => ({
      url: absoluteUrl(`/feed/${brief.slug}`),
      lastModified: new Date(brief.updatedAt),
      changeFrequency: "weekly" as const,
      priority: 0.6,
    })),
    ...categoryEntries,
    ...platformEntries,
    ...stackEntries,
    ...apiEntries,
    ...signalsEntries,
  ];
}
