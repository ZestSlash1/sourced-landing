import type { MetadataRoute } from "next";
import { listPublishedSlugsForSitemap } from "@/lib/idea-drops/repository";
import { absoluteUrl } from "@/lib/seo";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const briefs = await listPublishedSlugsForSitemap();

  return [
    { url: absoluteUrl("/"), changeFrequency: "weekly", priority: 1 },
    { url: absoluteUrl("/feed"), changeFrequency: "daily", priority: 0.8 },
    { url: absoluteUrl("/methodology"), changeFrequency: "weekly", priority: 0.5 },
    { url: absoluteUrl("/rejected"), changeFrequency: "daily", priority: 0.3 },
    ...briefs.map((brief) => ({
      url: absoluteUrl(`/feed/${brief.slug}`),
      lastModified: new Date(brief.updatedAt),
      changeFrequency: "weekly" as const,
      priority: 0.6,
    })),
  ];
}
