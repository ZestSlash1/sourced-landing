import Link from "next/link";
import type { Metadata } from "next";
import { MIN_CLUSTER_PLATFORMS, MIN_CLUSTER_SIZE } from "@/lib/ingest/clustering";
import { listRejectedClusters, type RejectedCluster } from "@/lib/ingest/pipeline-stats";
import { absoluteUrl } from "@/lib/seo";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 20;
const TITLE = "Rejected clusters";
const DESCRIPTION =
  "Every signal cluster that formed in Sourced's ingest pipeline but didn't clear the 3-signals / 2-platforms bar — shown in full, not hidden, as proof the filter is real.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: absoluteUrl("/rejected") },
  openGraph: {
    type: "website",
    title: `${TITLE} | Sourced`,
    description: DESCRIPTION,
    url: absoluteUrl("/rejected"),
  },
  twitter: {
    card: "summary_large_image",
    title: `${TITLE} | Sourced`,
    description: DESCRIPTION,
  },
};

function formatDateRange(min: string | null, max: string | null): string {
  if (!min || !max) return "—";
  const fmt = (d: string) => new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  return min === max ? fmt(min) : `${fmt(min)} – ${fmt(max)}`;
}

function whyFailed(c: RejectedCluster): string {
  const reasons: string[] = [];
  if (c.signalCount < MIN_CLUSTER_SIZE) reasons.push(`only ${c.signalCount} signal${c.signalCount === 1 ? "" : "s"}`);
  if (c.platformCount < MIN_CLUSTER_PLATFORMS) reasons.push(`only ${c.platformCount} platform${c.platformCount === 1 ? "" : "s"}`);
  return reasons.join(", ");
}

export default async function RejectedPage({ searchParams }: { searchParams: { page?: string } }) {
  const clusters = await listRejectedClusters();
  const totalPages = Math.max(1, Math.ceil(clusters.length / PAGE_SIZE));
  const requestedPage = Number(searchParams.page);
  const currentPage = Number.isFinite(requestedPage) ? Math.min(Math.max(1, requestedPage), totalPages) : 1;
  const pageItems = clusters.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  return (
    <main>
      <RejectedJsonLd />

      <div className="wrap" style={{ paddingTop: 48 }}>
        <Link href="/methodology" className="back-link">
          ← Back to methodology
        </Link>
        <h1 className="display" style={{ fontSize: "clamp(28px,4vw,38px)", fontWeight: 700, letterSpacing: "-0.02em", margin: "18px 0 10px" }}>
          Rejected clusters
        </h1>
        <p style={{ color: "var(--ink-soft)", fontSize: 16, maxWidth: 640, margin: 0 }}>
          Every signal cluster that formed but didn&apos;t clear the {MIN_CLUSTER_SIZE}-signals / {MIN_CLUSTER_PLATFORMS}
          -platforms bar — shown in full, not swept away. No source links, no signal text, no brief content: just the
          shape of what got filtered out.
        </p>
      </div>

      <section className="section">
        <div className="wrap">
          {clusters.length === 0 ? (
            <div className="empty-state">
              No rejected clusters yet — the pipeline is still accumulating signals across sources. Check back as the
              pool grows.
            </div>
          ) : (
            <>
              <p className="transparency-note" style={{ marginBottom: 16 }}>
                {clusters.length.toLocaleString()} rejected cluster{clusters.length === 1 ? "" : "s"} · showing{" "}
                {pageItems.length} · page {currentPage} of {totalPages}
              </p>
              <div className="reject-list">
                {pageItems.map((c) => (
                  <div className="reject-card" key={c.clusterKey}>
                    <div className="reject-card-head">
                      <h3>{c.theme}</h3>
                      <span className="reject-reason mono">Why: {whyFailed(c)}</span>
                    </div>
                    <div className="reject-meta">
                      <span>
                        <strong>{c.signalCount}</strong> signal{c.signalCount === 1 ? "" : "s"}
                      </span>
                      <span className="reject-platforms">{c.platforms.join(" · ")}</span>
                      <span>{formatDateRange(c.minPostedAt, c.maxPostedAt)}</span>
                    </div>
                  </div>
                ))}
              </div>

              {totalPages > 1 ? (
                <nav className="pagination" aria-label="Rejected clusters pagination">
                  {currentPage > 1 ? (
                    <Link href={currentPage - 1 === 1 ? "/rejected" : `/rejected?page=${currentPage - 1}`}>← Prev</Link>
                  ) : (
                    <span className="is-disabled">← Prev</span>
                  )}
                  <span className="page-current">
                    {currentPage} / {totalPages}
                  </span>
                  {currentPage < totalPages ? (
                    <Link href={`/rejected?page=${currentPage + 1}`}>Next →</Link>
                  ) : (
                    <span className="is-disabled">Next →</span>
                  )}
                </nav>
              ) : null}
            </>
          )}
        </div>
      </section>
    </main>
  );
}

function RejectedJsonLd() {
  const json = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: TITLE,
    description: DESCRIPTION,
    url: absoluteUrl("/rejected"),
    isPartOf: { "@type": "WebSite", name: "Sourced", url: absoluteUrl("/") },
  };
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(json) }} />;
}
