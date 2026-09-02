import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { listPublishedIdeas } from "@/lib/idea-drops/repository";
import { stackFacets, ideasForStackSlug, labelForSlug } from "@/lib/idea-drops/facets";
import { absoluteUrl } from "@/lib/seo";
import Breadcrumbs from "../../breadcrumbs";
import { FacetIdeaGrid } from "../../facet-listing";

export const revalidate = 86400;

const PAGE_SIZE = 20;

export async function generateMetadata({ params }: { params: { technology: string } }): Promise<Metadata> {
  const ideas = await listPublishedIdeas();
  const technology = labelForSlug(stackFacets(ideas), params.technology);
  if (!technology) return { title: "Stack not found", robots: { index: false, follow: false } };

  const title = `SaaS Ideas Built with ${technology}`;
  const description = `Validated startup ideas with a launch stack that includes ${technology}, each with a full build brief, matched APIs, and free-tier notes.`;
  const url = absoluteUrl(`/stack/${params.technology}`);

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: { type: "website", title: `${title} | Sourced`, description, url },
    twitter: { card: "summary_large_image", title: `${title} | Sourced`, description },
  };
}

export default async function StackPage({
  params,
  searchParams,
}: {
  params: { technology: string };
  searchParams: { page?: string };
}) {
  const allIdeas = await listPublishedIdeas();
  const facets = stackFacets(allIdeas);
  const technology = labelForSlug(facets, params.technology);
  if (!technology) notFound();

  const ideas = ideasForStackSlug(allIdeas, params.technology);
  const page = Number(searchParams.page) || 1;

  return (
    <main>
      <StackJsonLd technology={technology} slug={params.technology} count={ideas.length} />

      <div className="wrap" style={{ paddingTop: 48 }}>
        <Breadcrumbs items={[{ name: technology, path: `/stack/${params.technology}` }]} />
        <h1 className="display" style={{ fontSize: "clamp(26px,4vw,36px)", fontWeight: 700, letterSpacing: "-0.02em", margin: "0 0 10px" }}>
          SaaS Ideas Built with {technology}
        </h1>
        <p style={{ color: "var(--ink-soft)", fontSize: 16, maxWidth: 640, margin: 0 }}>
          {ideas.length} idea{ideas.length === 1 ? "" : "s"} whose suggested launch stack includes {technology}.
        </p>
      </div>

      <section className="section">
        <div className="wrap">
          {ideas.length === 0 ? (
            <div className="empty-state">No published ideas built with {technology} yet.</div>
          ) : (
            <FacetIdeaGrid ideas={ideas} page={page} pageSize={PAGE_SIZE} basePath={`/stack/${params.technology}`} />
          )}
          <p className="transparency-note" style={{ marginTop: 20 }}>
            <Link href="/category">Browse by category →</Link>
          </p>
        </div>
      </section>
    </main>
  );
}

function StackJsonLd({ technology, slug, count }: { technology: string; slug: string; count: number }) {
  const json = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: `SaaS Ideas Built with ${technology}`,
    description: `${count} validated startup ideas with a launch stack that includes ${technology}.`,
    url: absoluteUrl(`/stack/${slug}`),
    isPartOf: { "@type": "WebSite", name: "Sourced", url: absoluteUrl("/") },
  };
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(json) }} />;
}
