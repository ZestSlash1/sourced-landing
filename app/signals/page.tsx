import Link from "next/link";
import type { Metadata } from "next";
import { listSignalsPage } from "@/lib/ingest/raw-signals-repository";
import { PLATFORM_LABELS } from "@/lib/idea-drops/facets";
import { absoluteUrl } from "@/lib/seo";
import Breadcrumbs from "../breadcrumbs";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 50;
const TITLE = "Signals — Raw Pipeline Input";
const DESCRIPTION =
  "Every raw signal Sourced's pipeline has ingested, listed as-is: title, source platform, and a link to the original post. This is the unfiltered input, not curated marketing copy.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: absoluteUrl("/signals") },
  openGraph: {
    type: "website",
    title: `${TITLE} | Sourced`,
    description: DESCRIPTION,
    url: absoluteUrl("/signals"),
  },
  twitter: {
    card: "summary_large_image",
    title: `${TITLE} | Sourced`,
    description: DESCRIPTION,
  },
};

function formatRelative(iso: string | null): string {
  if (!iso) return "—";
  const diffMs = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diffMs / 86_400_000);
  if (days <= 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;
  return `${Math.floor(months / 12)}y ago`;
}

export default async function SignalsPage({ searchParams }: { searchParams: { page?: string } }) {
  const requestedPage = Number(searchParams.page);
  const page = Number.isFinite(requestedPage) && requestedPage > 0 ? Math.floor(requestedPage) : 1;
  const { signals, total } = await listSignalsPage(page, PAGE_SIZE);
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);

  return (
    <main>
      <SignalsJsonLd count={total} />

      <div className="wrap" style={{ paddingTop: 48 }}>
        <Breadcrumbs items={[{ name: "Signals", path: "/signals" }]} />
        <h1 className="display" style={{ fontSize: "clamp(28px,4vw,38px)", fontWeight: 700, letterSpacing: "-0.02em", margin: "0 0 10px" }}>
          Signals
        </h1>
        <p style={{ color: "var(--ink-soft)", fontSize: 16, maxWidth: 640, margin: "0 0 6px" }}>
          Every signal Sourced&apos;s pipeline has pulled in, listed as-is: title, source, and a link to the
          original post. This is the raw material, not curated ideas — most signals here never become a brief. See{" "}
          <Link href="/methodology">how the filtering works →</Link>
        </p>
      </div>

      <section className="section">
        <div className="wrap">
          {signals.length === 0 ? (
            <div className="empty-state">No signals ingested yet. Check back soon.</div>
          ) : (
            <>
              <p className="transparency-note" style={{ marginBottom: 8 }}>
                {total.toLocaleString()} signal{total === 1 ? "" : "s"} · page {currentPage} of {totalPages}
              </p>
              <div className="signal-list">
                {signals.map((s) => (
                  <div className="signal-row" key={s.id}>
                    <a href={s.url} target="_blank" rel="noopener noreferrer">
                      {s.title ?? "Untitled"}
                    </a>
                    <span className="signal-badge">{PLATFORM_LABELS[s.source] ?? s.source}</span>
                    {s.classifiedAsComplaint === true ? (
                      <span className="signal-badge is-complaint">Complaint</span>
                    ) : s.classifiedAsComplaint === false ? (
                      <span className="signal-badge">Not a complaint</span>
                    ) : (
                      <span className="signal-badge">Pending review</span>
                    )}
                    <span className="signal-badge">{formatRelative(s.postedAt)}</span>
                  </div>
                ))}
              </div>

              {totalPages > 1 ? (
                <nav className="pagination" aria-label="Signals pagination">
                  {currentPage > 1 ? (
                    <Link href={currentPage - 1 === 1 ? "/signals" : `/signals?page=${currentPage - 1}`} rel="prev">
                      ← Prev
                    </Link>
                  ) : (
                    <span className="is-disabled">← Prev</span>
                  )}
                  <span className="page-current">
                    {currentPage} / {totalPages}
                  </span>
                  {currentPage < totalPages ? (
                    <Link href={`/signals?page=${currentPage + 1}`} rel="next">
                      Next →
                    </Link>
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

function SignalsJsonLd({ count }: { count: number }) {
  const json = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: TITLE,
    description: `${count.toLocaleString()} raw signals ingested by Sourced's pipeline.`,
    url: absoluteUrl("/signals"),
    isPartOf: { "@type": "WebSite", name: "Sourced", url: absoluteUrl("/") },
  };
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(json) }} />;
}
