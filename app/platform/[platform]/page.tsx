import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { listPublishedIdeas } from "@/lib/idea-drops/repository";
import { platformFacets, ideasForPlatformSlug, labelForSlug } from "@/lib/idea-drops/facets";
import { absoluteUrl } from "@/lib/seo";
import Breadcrumbs from "../../breadcrumbs";
import { FacetIdeaGrid } from "../../facet-listing";

export const revalidate = 86400;

const PAGE_SIZE = 20;

export async function generateMetadata({ params }: { params: { platform: string } }): Promise<Metadata> {
  const ideas = await listPublishedIdeas();
  const platform = labelForSlug(platformFacets(ideas), params.platform);
  if (!platform) return { title: "Platform not found", robots: { index: false, follow: false } };

  const title = `SaaS Ideas Sourced from ${platform} — Real Developer Pain Points`;
  const description = `Startup ideas triangulated from real complaints and feature requests posted on ${platform}, each backed by a build brief and matched APIs.`;
  const url = absoluteUrl(`/platform/${params.platform}`);

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: { type: "website", title: `${title} | Sourced`, description, url },
    twitter: { card: "summary_large_image", title: `${title} | Sourced`, description },
  };
}

export default async function PlatformPage({
  params,
  searchParams,
}: {
  params: { platform: string };
  searchParams: { page?: string };
}) {
  const allIdeas = await listPublishedIdeas();
  const facets = platformFacets(allIdeas);
  const platform = labelForSlug(facets, params.platform);
  if (!platform) notFound();

  const ideas = ideasForPlatformSlug(allIdeas, params.platform);
  const page = Number(searchParams.page) || 1;

  return (
    <main>
      <PlatformJsonLd platform={platform} slug={params.platform} count={ideas.length} />

      <div className="wrap" style={{ paddingTop: 48 }}>
        <Breadcrumbs items={[{ name: platform, path: `/platform/${params.platform}` }]} />
        <h1 className="display" style={{ fontSize: "clamp(26px,4vw,36px)", fontWeight: 700, letterSpacing: "-0.02em", margin: "0 0 10px" }}>
          SaaS Ideas Sourced from {platform} — Real Developer Pain Points
        </h1>
        <p style={{ color: "var(--ink-soft)", fontSize: 16, maxWidth: 640, margin: 0 }}>
          {ideas.length} idea{ideas.length === 1 ? "" : "s"} triangulated from evidence that includes at least one
          real post on {platform}.
        </p>
      </div>

      <section className="section">
        <div className="wrap">
          {ideas.length === 0 ? (
            <div className="empty-state">No published ideas sourced from {platform} yet.</div>
          ) : (
            <FacetIdeaGrid ideas={ideas} page={page} pageSize={PAGE_SIZE} basePath={`/platform/${params.platform}`} />
          )}
          <p className="transparency-note" style={{ marginTop: 20 }}>
            <Link href="/category">Browse by category →</Link>
          </p>
        </div>
      </section>
    </main>
  );
}

function PlatformJsonLd({ platform, slug, count }: { platform: string; slug: string; count: number }) {
  const json = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: `SaaS Ideas Sourced from ${platform}`,
    description: `${count} validated startup ideas with evidence from ${platform}.`,
    url: absoluteUrl(`/platform/${slug}`),
    isPartOf: { "@type": "WebSite", name: "Sourced", url: absoluteUrl("/") },
  };
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(json) }} />;
}
