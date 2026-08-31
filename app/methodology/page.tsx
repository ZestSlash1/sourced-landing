import Link from "next/link";
import type { Metadata } from "next";
import { requireAdmin } from "@/lib/auth/require-admin";
import { EMBEDDING_SIMILARITY_THRESHOLD, MIN_CLUSTER_SIZE } from "@/lib/ingest/clustering";
import { getMethodologyStats } from "@/lib/ingest/pipeline-stats";
import { listRecentPipelineRuns } from "@/lib/ingest/pipeline-runs-repository";
import { absoluteUrl } from "@/lib/seo";
import NewsletterForm from "../newsletter-form";

export const dynamic = "force-dynamic";

const TITLE = "Methodology — How We Validate Ideas";
const DESCRIPTION =
  "How Sourced turns real complaints into evidence-backed build briefs — the sources, the filtering bar, and live numbers from the ingest pipeline.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: absoluteUrl("/methodology") },
  openGraph: {
    type: "website",
    title: `${TITLE} | Sourced`,
    description: DESCRIPTION,
    url: absoluteUrl("/methodology"),
  },
  twitter: {
    card: "summary_large_image",
    title: `${TITLE} | Sourced`,
    description: DESCRIPTION,
  },
};

const SOURCES = [
  {
    label: "Hacker News",
    description:
      "Posts and comments matching pain phrases like \"wish there was\" or \"looking for a tool\", above a minimum points threshold.",
  },
  {
    label: "StackExchange",
    description:
      "Barely-answered questions on Webmasters, Software Recs, UX, PM, and other workflow-focused sites — an unanswered question is often an unmet need.",
  },
  {
    label: "GitHub Issues",
    description:
      "Feature requests and complaints on a curated list of high-traffic dev-infrastructure and app-building repos.",
  },
  {
    label: "Dev.to",
    description:
      "Posts tagged discuss, watercooler, or help — Dev.to's venting/opinion tags, above a minimum reactions and comments bar.",
  },
  {
    label: "Lobsters",
    description: "Stories above a minimum score and comment count, on the same complaint-prose register as Hacker News.",
  },
];

const PENDING_SOURCE = {
  label: "Reddit",
  description:
    "The poller is built and wired into the daily cron, but isn't live yet — it's waiting on Reddit API credentials before it starts contributing signals.",
};

export default async function MethodologyPage() {
  const [stats, pipelineRuns, adminCheck] = await Promise.all([
    getMethodologyStats(),
    listRecentPipelineRuns(5),
    requireAdmin(),
  ]);
  const isAdmin = adminCheck.ok;

  return (
    <main>
      <MethodologyJsonLd />

      <div className="wrap" style={{ paddingTop: 48 }}>
        <Link href="/" className="back-link">
          ← Back to Sourced
        </Link>
        <h1 className="display" style={{ fontSize: "clamp(28px,4vw,38px)", fontWeight: 700, letterSpacing: "-0.02em", margin: "18px 0 10px" }}>
          Methodology
        </h1>
        <p style={{ color: "var(--ink-soft)", fontSize: 16, maxWidth: 640, margin: 0 }}>
          Every idea in the feed starts as a real complaint, not a generated headline. Here&apos;s exactly how a post
          on a forum becomes a build brief — and what gets thrown out along the way.
        </p>
      </div>

      <section className="section">
        <div className="wrap">
          <div className="eyebrow">Where ideas come from</div>
          <h2>Five sources, one more on the way</h2>
          <p className="section-sub" style={{ maxWidth: 640, marginBottom: 28 }}>
            Every signal is a real post, question, issue, or article — pulled daily, deduped on URL, and never
            paraphrased before storage.
          </p>
          <div className="source-grid">
            {SOURCES.map((s) => (
              <div className="source-card" key={s.label}>
                <div className="stage-icon">{s.label}</div>
                <p>{s.description}</p>
              </div>
            ))}
            <div className="source-card is-pending">
              <div className="stage-icon">{PENDING_SOURCE.label} · not active yet</div>
              <p>{PENDING_SOURCE.description}</p>
            </div>
          </div>
        </div>
      </section>

      <section className="section" style={{ paddingTop: 0 }}>
        <div className="wrap">
          <div className="eyebrow">How we filter</div>
          <h2>The bar, not vibes</h2>
          <p className="section-sub" style={{ maxWidth: 640, marginBottom: 28 }}>
            This is the actual reason ideas here come with evidence attached instead of just sounding plausible.
          </p>
          <ol className="bar-list">
            <li>
              <span className="bar-num">1</span>
              <span>
                Every signal is embedded (OpenRouter, text-embedding-3-small) and compared against every other
                signal by cosine similarity. Two signals above{" "}
                <strong className="mono">{EMBEDDING_SIMILARITY_THRESHOLD}</strong> similarity are folded into the
                same cluster — they&apos;re treated as describing the same underlying problem, regardless of the
                words either author used.
              </span>
            </li>
            <li>
              <span className="bar-num">2</span>
              <span>
                A cluster only qualifies once it has <strong>{MIN_CLUSTER_SIZE}+ independent signals</strong> —
                distinct authors describing the same underlying problem. One angry HN post isn&apos;t evidence of
                demand; three independent people hitting it is. When those signals span more than one platform, that
                cross-platform spread is tracked and shown as stronger evidence — but it&apos;s no longer required to
                clear the bar, since a narrow technical complaint repeated by three independent authors on a single
                platform is itself real, repeated demand.
              </span>
            </li>
            <li>
              <span className="bar-num">3</span>
              <span>
                A human reviews every qualifying cluster at{" "}
                <span className="mono">/admin/pending</span> before it&apos;s drafted into a brief and published —
                clearing the bar gets a cluster in front of a reviewer, it doesn&apos;t auto-publish anything.
              </span>
            </li>
          </ol>
        </div>
      </section>

      <section className="section" style={{ paddingTop: 0 }} aria-labelledby="methodology-newsletter-heading">
        <div className="wrap">
          <div className="newsletter-inline">
            <h2 id="methodology-newsletter-heading">Want the next one?</h2>
            <p>We’ll send one evidence-backed build opportunity when the weekly drop is ready.</p>
            <NewsletterForm sourcePath="/methodology" />
          </div>
        </div>
      </section>

      <section className="section" style={{ paddingTop: 0 }}>
        <div className="wrap">
          <div className="eyebrow">Live numbers</div>
          <h2>Right now, from the database</h2>
          <p className="section-sub" style={{ maxWidth: 640, marginBottom: 24 }}>
            Queried fresh on every page load — including the zeros, if that&apos;s what&apos;s true today.
          </p>
          <div className="stat-grid">
            <StatTile label="Signals ingested" value={stats.signalsIngested} />
            <StatTile label="Sources active" value={stats.sourcesActive} />
            <StatTile label="Clusters formed" value={stats.clustersFormed} />
            <StatTile label="Clusters passing the bar" value={stats.clustersPassingBar} accent />
            <StatTile label="Briefs published" value={stats.briefsPublished} accent />
          </div>
          <p className="transparency-note" style={{ marginTop: 16 }}>
            Curious what didn&apos;t make it? <Link href="/rejected">See every rejected cluster →</Link>
          </p>
        </div>
      </section>

      <section className="section" style={{ paddingTop: 0 }}>
        <div className="wrap">
          <div className="eyebrow">Pipeline health</div>
          <h2>Last {pipelineRuns.length || 5} draft-pass runs</h2>
          {pipelineRuns.length === 0 ? (
            <div className="empty-state">No pipeline runs recorded yet — the draft-ideas cron writes here after each pass.</div>
          ) : (
            <div className="table-card">
              <table className="mini-table mono">
                <thead>
                  <tr>
                    <th>Ran at</th>
                    <th>Complaints</th>
                    <th>Clusters formed</th>
                    <th>Passing bar</th>
                    <th>Cross-platform</th>
                    <th>Errors</th>
                  </tr>
                </thead>
                <tbody>
                  {pipelineRuns.map((r) => (
                    <tr key={r.id}>
                      <td>{new Date(r.ranAt).toLocaleString()}</td>
                      <td>{r.classifiedComplaint}</td>
                      <td>{r.clustersFormed}</td>
                      <td>{r.clustersPassingBar}</td>
                      <td>{r.clustersPassingBarMultiPlatform}</td>
                      <td>{r.errors.length}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {isAdmin ? (
            <p className="transparency-note" style={{ marginTop: 14 }}>
              <Link href="/admin/analytics">Full pipeline analytics →</Link>
            </p>
          ) : null}
        </div>
      </section>
    </main>
  );
}

function StatTile({ label, value, accent }: { label: string; value: number; accent?: boolean }) {
  return (
    <div className="stat-tile">
      <div className={`stat-value mono${accent ? " accent" : ""}`}>{value.toLocaleString()}</div>
      <div className="stat-label">{label}</div>
    </div>
  );
}

function MethodologyJsonLd() {
  const json = {
    "@context": "https://schema.org",
    "@type": "AboutPage",
    name: "Methodology",
    description: DESCRIPTION,
    url: absoluteUrl("/methodology"),
    isPartOf: { "@type": "WebSite", name: "Sourced", url: absoluteUrl("/") },
  };
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(json) }} />;
}
