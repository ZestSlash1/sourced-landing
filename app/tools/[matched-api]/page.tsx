import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { listPublishedIdeas } from "@/lib/idea-drops/repository";
import { apiFacets, ideasForApiSlug, labelForSlug } from "@/lib/idea-drops/facets";
import { absoluteUrl } from "@/lib/seo";
import Breadcrumbs from "../../breadcrumbs";
import { FacetIdeaGrid } from "../../facet-listing";

export const revalidate = 86400;

const PAGE_SIZE = 20;

export async function generateMetadata({ params }: { params: { "matched-api": string } }): Promise<Metadata> {
  const slug = params["matched-api"];
  const ideas = await listPublishedIdeas();
  const api = labelForSlug(apiFacets(ideas), slug);
  if (!api) return { title: "API not found", robots: { index: false, follow: false } };

  const title = `SaaS Ideas Using the ${api} API`;
  const description = `Startup ideas that match ${api} to a real problem, with the specific use case, free-tier limit, and full build brief.`;
  const url = absoluteUrl(`/tools/${slug}`);

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: { type: "website", title: `${title} | Sourced`, description, url },
    twitter: { card: "summary_large_image", title: `${title} | Sourced`, description },
  };
}

export default async function ApiPage({
  params,
  searchParams,
}: {
  params: { "matched-api": string };
  searchParams: { page?: string };
}) {
  const slug = params["matched-api"];
  const allIdeas = await listPublishedIdeas();
  const facets = apiFacets(allIdeas);
  const api = labelForSlug(facets, slug);
  if (!api) notFound();

  const ideas = ideasForApiSlug(allIdeas, slug);
  const page = Number(searchParams.page) || 1;

  return (
    <main>
      <ApiJsonLd api={api} slug={slug} count={ideas.length} />

      <div className="wrap" style={{ paddingTop: 48 }}>
        <Breadcrumbs items={[{ name: api, path: `/tools/${slug}` }]} />
        <h1 className="display" style={{ fontSize: "clamp(26px,4vw,36px)", fontWeight: 700, letterSpacing: "-0.02em", margin: "0 0 10px" }}>
          SaaS Ideas Using the {api} API
        </h1>
        <p style={{ color: "var(--ink-soft)", fontSize: 16, maxWidth: 640, margin: 0 }}>
          {ideas.length} idea{ideas.length === 1 ? "" : "s"} matched to {api} for a specific part of the build.
        </p>
      </div>

      <section className="section">
        <div className="wrap">
          {ideas.length === 0 ? (
            <div className="empty-state">No published ideas using {api} yet.</div>
          ) : (
            <FacetIdeaGrid ideas={ideas} page={page} pageSize={PAGE_SIZE} basePath={`/tools/${slug}`} />
          )}
          <p className="transparency-note" style={{ marginTop: 20 }}>
            <Link href="/category">Browse by category →</Link>
          </p>
        </div>
      </section>
    </main>
  );
}

function ApiJsonLd({ api, slug, count }: { api: string; slug: string; count: number }) {
  const json = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: `SaaS Ideas Using the ${api} API`,
    description: `${count} validated startup ideas that match the ${api} API to a real problem.`,
    url: absoluteUrl(`/tools/${slug}`),
    isPartOf: { "@type": "WebSite", name: "Sourced", url: absoluteUrl("/") },
  };
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(json) }} />;
}
