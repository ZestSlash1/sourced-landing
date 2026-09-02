import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { listPublishedIdeas, listPublishedIdeasByCategory } from "@/lib/idea-drops/repository";
import { categoryFacets, labelForSlug } from "@/lib/idea-drops/facets";
import { absoluteUrl, truncate } from "@/lib/seo";
import Breadcrumbs from "../../breadcrumbs";

export const revalidate = 86400;

const PAGE_SIZE = 20;

async function resolveCategory(slug: string): Promise<string | null> {
  const ideas = await listPublishedIdeas();
  return labelForSlug(categoryFacets(ideas), slug);
}

export async function generateMetadata({ params }: { params: { category: string } }): Promise<Metadata> {
  const category = await resolveCategory(params.category);
  if (!category) return { title: "Category not found", robots: { index: false, follow: false } };

  const title = `${category} SaaS Ideas — Validated from Real Developer Complaints`;
  const description = `${category} startup ideas sourced from real developer complaints and triangulated across platforms, with build briefs, matched APIs, and a launch stack.`;
  const url = absoluteUrl(`/category/${params.category}`);

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: { type: "website", title: `${title} | Sourced`, description, url },
    twitter: { card: "summary_large_image", title: `${title} | Sourced`, description },
  };
}

export default async function CategoryPage({
  params,
  searchParams,
}: {
  params: { category: string };
  searchParams: { page?: string };
}) {
  const category = await resolveCategory(params.category);
  if (!category) notFound();

  const ideas = await listPublishedIdeasByCategory(category);
  const totalPages = Math.max(1, Math.ceil(ideas.length / PAGE_SIZE));
  const requestedPage = Number(searchParams.page);
  const currentPage = Number.isFinite(requestedPage) ? Math.min(Math.max(1, requestedPage), totalPages) : 1;
  const pageItems = ideas.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  return (
    <main>
      <CategoryJsonLd category={category} slug={params.category} count={ideas.length} />

      <div className="wrap" style={{ paddingTop: 48 }}>
        <Breadcrumbs
          items={[
            { name: "Category", path: "/category" },
            { name: category, path: `/category/${params.category}` },
          ]}
        />
        <h1 className="display" style={{ fontSize: "clamp(26px,4vw,36px)", fontWeight: 700, letterSpacing: "-0.02em", margin: "0 0 10px" }}>
          {category} SaaS Ideas — Validated from Real Developer Complaints
        </h1>
        <p style={{ color: "var(--ink-soft)", fontSize: 16, maxWidth: 640, margin: 0 }}>
          Every {category} idea below started as a real complaint on a forum, issue tracker, or Q&A site, then
          cleared Sourced&apos;s multi-signal evidence bar before it became a build brief.
        </p>
      </div>

      <section className="section">
        <div className="wrap">
          {ideas.length === 0 ? (
            <div className="empty-state">No published {category} ideas yet.</div>
          ) : (
            <>
              <div className="feed-grid">
                {pageItems.map((idea) => (
                  <Link key={idea.id} href={`/feed/${idea.slug}`} className="feed-card">
                    <div className="feed-card-cover cover-1">
                      <span className="tag">{idea.category}</span>
                      <span className="score">{idea.demandScore}% demand</span>
                    </div>
                    <div className="feed-card-body">
                      <h2>{idea.title}</h2>
                      <p>{truncate(idea.problem.summary, 160)}</p>
                    </div>
                  </Link>
                ))}
              </div>

              {totalPages > 1 ? (
                <nav className="pagination" aria-label="Category pagination">
                  {currentPage > 1 ? (
                    <Link href={currentPage - 1 === 1 ? `/category/${params.category}` : `/category/${params.category}?page=${currentPage - 1}`}>
                      ← Prev
                    </Link>
                  ) : (
                    <span className="is-disabled">← Prev</span>
                  )}
                  <span className="page-current">
                    {currentPage} / {totalPages}
                  </span>
                  {currentPage < totalPages ? (
                    <Link href={`/category/${params.category}?page=${currentPage + 1}`}>Next →</Link>
                  ) : (
                    <span className="is-disabled">Next →</span>
                  )}
                </nav>
              ) : null}
            </>
          )}

          <p className="transparency-note" style={{ marginTop: 20 }}>
            <Link href="/category">← All categories</Link>
          </p>
        </div>
      </section>
    </main>
  );
}

function CategoryJsonLd({ category, slug, count }: { category: string; slug: string; count: number }) {
  const json = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: `${category} SaaS Ideas`,
    description: `${count} validated ${category} startup ideas sourced from real developer complaints.`,
    url: absoluteUrl(`/category/${slug}`),
    isPartOf: { "@type": "WebSite", name: "Sourced", url: absoluteUrl("/") },
  };
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(json) }} />;
}
