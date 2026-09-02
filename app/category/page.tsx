import Link from "next/link";
import type { Metadata } from "next";
import { listPublishedIdeas } from "@/lib/idea-drops/repository";
import { categoryFacets } from "@/lib/idea-drops/facets";
import { absoluteUrl } from "@/lib/seo";
import Breadcrumbs from "../breadcrumbs";

export const revalidate = 86400;

const TITLE = "Browse SaaS Ideas by Category";
const DESCRIPTION =
  "Every category of validated startup idea on Sourced, each backed by real developer complaints, not generated headlines.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: absoluteUrl("/category") },
  openGraph: {
    type: "website",
    title: `${TITLE} | Sourced`,
    description: DESCRIPTION,
    url: absoluteUrl("/category"),
  },
  twitter: {
    card: "summary_large_image",
    title: `${TITLE} | Sourced`,
    description: DESCRIPTION,
  },
};

export default async function CategoryIndexPage() {
  const ideas = await listPublishedIdeas();
  const facets = categoryFacets(ideas);

  return (
    <main>
      <div className="wrap" style={{ paddingTop: 48 }}>
        <Breadcrumbs items={[{ name: "Category", path: "/category" }]} />
        <h1 className="display" style={{ fontSize: "clamp(28px,4vw,38px)", fontWeight: 700, letterSpacing: "-0.02em", margin: "0 0 10px" }}>
          Browse by category
        </h1>
        <p style={{ color: "var(--ink-soft)", fontSize: 16, maxWidth: 640, margin: 0 }}>
          {facets.length} categor{facets.length === 1 ? "y" : "ies"} of validated ideas, each one backed by real
          complaints, not a generated headline.
        </p>
      </div>

      <section className="section">
        <div className="wrap">
          {facets.length === 0 ? (
            <div className="empty-state">No published ideas yet. Check back soon.</div>
          ) : (
            <div className="facet-index-grid">
              {facets.map((f) => (
                <Link key={f.slug} href={`/category/${f.slug}`} className="facet-index-card">
                  <h3>{f.label}</h3>
                  <span>
                    {f.count} idea{f.count === 1 ? "" : "s"}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
