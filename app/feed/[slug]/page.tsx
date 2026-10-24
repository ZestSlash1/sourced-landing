import Link from "next/link";
import { notFound } from "next/navigation";
import { headers } from "next/headers";
import type { Metadata } from "next";
import { resolveCurrency } from "@/lib/currency";
import { getPublishedIdeaByIdOrSlug, listPublishedIdeasByCategory } from "@/lib/idea-drops/repository";
import { nextQuotaResetIso } from "@/lib/idea-drops/quota";
import { resolveAndRecordAccess, resolveViewerContext } from "@/lib/idea-drops/resolve-access";
import type { IdeaAccess } from "@/lib/idea-drops/resolve-access";
import { getTriangulation, type Triangulation } from "@/lib/idea-drops/triangulation";
import { PLATFORM_LABELS } from "@/lib/idea-drops/facets";
import { slugify } from "@/lib/slugify";
import type { IdeaDrop } from "@/types/idea-drop";
import { absoluteUrl, truncate } from "@/lib/seo";
import CopyPromptButton from "./copy-prompt-button";
import UnlockTracker from "./unlock-tracker";
import TriangulationBadge from "../triangulation-badge";
import Breadcrumbs from "../../breadcrumbs";
import { computeEconomicAssessment } from "@/lib/idea-drops/economic-severity";
import { generateOutreachPack } from "@/lib/idea-drops/outreach";
import { generateProductionContract } from "@/lib/idea-drops/production-contract";
import { generateCursorRules } from "@/lib/idea-drops/cursorrules-generator";
import { generateSqlSchema } from "@/lib/idea-drops/sql-schema-generator";
import { applyWatermark, generateLicenseFingerprint } from "@/lib/security/watermark";
import EconomicSeverityCard from "./economic-severity-card";
import OutreachPackPanel from "./outreach-pack-panel";
import BuilderExportPanel from "./builder-export-panel";
import nextDynamic from "next/dynamic";
import { BriefGraphFallback } from "@/components/r3f/brief-graph-fallback";
import OpportunityWatchButton from "@/components/opportunity-watch-button";
import { evidenceSummary } from "@/lib/idea-drops/evidence-summary";
import { evidenceFingerprint, listOpportunityWatches } from "@/lib/idea-drops/watchlist";

const BriefSolutionGraph = nextDynamic(
  () => import("@/components/r3f/brief-solution-graph").then((m) => m.BriefSolutionGraph),
  {
    ssr: false,
    loading: () => <BriefGraphFallback />,
  }
);

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const idea = await getPublishedIdeaByIdOrSlug(params.slug);
  if (!idea) {
    return { title: "Brief not found", robots: { index: false, follow: false } };
  }

  const description = truncate(idea.problem.summary, 155);
  const url = absoluteUrl(`/feed/${idea.slug}`);
  const ogImageUrl = `${url}/opengraph-image`;

  return {
    title: idea.title,
    description,
    alternates: { canonical: url },
    openGraph: {
      type: "article",
      title: idea.title,
      description,
      url,
      publishedTime: idea.publishedAt,
      images: [
        {
          url: ogImageUrl,
          width: 1200,
          height: 630,
          alt: `${idea.title} · Sourced Build Brief`,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: idea.title,
      description,
      images: [ogImageUrl],
    },
  };
}

export default async function IdeaDetailPage({ params }: { params: { slug: string } }) {
  const idea = await getPublishedIdeaByIdOrSlug(params.slug);
  if (!idea) notFound();

  const viewer = await resolveViewerContext();
  const access = await resolveAndRecordAccess(idea, viewer);
  const scoped = access.idea;
  const summary = evidenceSummary(idea.evidence);
  const watches = viewer.userId ? await listOpportunityWatches(viewer.userId) : [];
  const watch = watches.find((item) => item.ideaId === idea.id);
  const triangulation = await getTriangulation(idea.sourceSignalIds);
  const relatedIdeas = await listPublishedIdeasByCategory(idea.category, { excludeId: idea.id, limit: 3 });
  const categorySlug = slugify(idea.category);
  const platformSlugs = Array.from(new Set(idea.evidence.map((e) => e.platform)));

  const economicAssessment = computeEconomicAssessment(idea);

  const headerList = headers();
  const country = headerList.get("x-vercel-ip-country");
  const isUsd = resolveCurrency(country) === "USD";

  return (
    <main className="app-shell" style={{ maxWidth: 1160, margin: "0 auto", padding: "88px 24px 80px" }}>
      <BriefJsonLd idea={idea} access={access.kind} />
      {access.kind === "full" && access.freshUnlock && <UnlockTracker slug={idea.slug} />}

      {/* Embedded Responsive Dossier Styles */}
      <style>{`
        .dossier-layout {
          display: grid;
          grid-template-columns: 240px minmax(0, 1fr);
          gap: 36px;
          align-items: start;
        }
        .dossier-toc {
          position: sticky;
          top: 84px;
          background: var(--surface);
          border: 1px solid var(--line);
          border-radius: var(--r-lg);
          padding: 18px;
          box-shadow: var(--shadow);
        }
        .dossier-toc a {
          display: block;
          padding: 6px 10px;
          border-radius: var(--r-sm);
          font-size: 12.5px;
          color: var(--ink-soft);
          text-decoration: none;
          transition: all 0.15s ease;
        }
        .dossier-toc a:hover {
          color: var(--ink);
          background: rgba(255, 255, 255, 0.05);
        }
        .dossier-card-box {
          background: var(--surface);
          border: 1px solid var(--line);
          border-radius: var(--r-lg);
          padding: 26px 28px;
          box-shadow: var(--shadow);
          margin-bottom: 24px;
        }
        @media (max-width: 940px) {
          .dossier-layout {
            grid-template-columns: 1fr;
            gap: 20px;
          }
          .dossier-toc {
            display: none !important;
          }
        }
      `}</style>

      {/* Top Bar: Navigation, Breadcrumbs & Social Share */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 12,
          marginBottom: 16,
        }}
      >
        <Link
          href="/feed"
          className="back-link"
          style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13, marginBottom: 0 }}
        >
          <span>←</span> Back to feed
        </Link>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <a
            href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(
              `Building this micro-SaaS: "${idea.title}" (Research score: ${idea.demandScore}/100)\n\nResearch brief via @getsourced:`
            )}&url=${encodeURIComponent(absoluteUrl(`/feed/${idea.slug}`))}`}
            target="_blank"
            rel="noopener noreferrer"
            className="facet-chip"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              textDecoration: "none",
              fontSize: 12,
              padding: "6px 14px",
              background: "var(--surface)",
              borderColor: "var(--line)",
            }}
          >
            <span>Share on 𝕏</span>
          </a>
        </div>
      </div>

      <Breadcrumbs
        items={[
          { name: "Feed", path: "/feed" },
          { name: idea.category, path: `/category/${categorySlug}` },
          { name: idea.title, path: `/feed/${idea.slug}` },
        ]}
      />

      {/* High-Impact Dossier Header */}
      <div
        style={{
          background: "linear-gradient(180deg, var(--surface-elevated) 0%, var(--surface) 100%)",
          border: "1px solid var(--line)",
          borderRadius: "var(--r-xl)",
          padding: "32px 32px 28px",
          boxShadow: "var(--shadow)",
          marginBottom: 32,
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Subtle accent hairline */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: 2,
            background: "linear-gradient(90deg, var(--violet) 0%, #38BDF8 50%, #34D399 100%)",
          }}
        />

        {/* Top Badges & Metric Pill Row */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 12,
            marginBottom: 16,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <span
              style={{
                fontFamily: "var(--font-jetbrains-mono), monospace",
                fontSize: 11,
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                padding: "4px 10px",
                borderRadius: "var(--r-chip)",
                background: "rgba(124, 58, 237, 0.16)",
                color: "var(--violet-deep)",
                border: "1px solid rgba(124, 58, 237, 0.35)",
              }}
            >
              {idea.category}
            </span>

            {idea.difficulty?.soloWeekendProject && (
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 4,
                  fontSize: 11,
                  fontWeight: 600,
                  padding: "4px 10px",
                  borderRadius: "var(--r-chip)",
                  background: "rgba(139, 92, 246, 0.14)",
                  color: "#C4B5FD",
                  border: "1px solid rgba(139, 92, 246, 0.28)",
                }}
              >
                ⚡ Solo Weekend Project
              </span>
            )}

            {idea.difficulty?.estimatedHours && (
              <span
                style={{
                  fontSize: 11,
                  fontFamily: "var(--font-jetbrains-mono), monospace",
                  padding: "4px 10px",
                  borderRadius: "var(--r-chip)",
                  background: "rgba(255, 255, 255, 0.05)",
                  color: "var(--ink-soft)",
                  border: "1px solid var(--line)",
                }}
              >
                ⏱ ~{idea.difficulty.estimatedHours}h Scope
              </span>
            )}

            {idea.difficulty?.skillFloor && (
              <span
                style={{
                  fontSize: 11,
                  textTransform: "capitalize",
                  padding: "4px 10px",
                  borderRadius: "var(--r-chip)",
                  background: "rgba(255, 255, 255, 0.05)",
                  color: "var(--ink-soft)",
                  border: "1px solid var(--line)",
                }}
              >
                🎯 {idea.difficulty.skillFloor} Floor
              </span>
            )}
          </div>

          {/* Research Score Pill */}
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              background: "rgba(0, 0, 0, 0.35)",
              border: "1px solid var(--line)",
              padding: "5px 12px",
              borderRadius: "var(--r-chip)",
              fontFamily: "var(--font-jetbrains-mono), monospace",
              fontSize: 12,
            }}
          >
            <span style={{ color: "var(--ink-soft)" }}>Research Score</span>
            <span style={{ color: "#34D399", fontWeight: 700, fontSize: 13 }}>
              {idea.demandScore}/100
            </span>
          </div>
        </div>

        {/* Title */}
        <h1
          className="brief-title display"
          style={{
            fontSize: "clamp(26px, 3.8vw, 38px)",
            lineHeight: 1.15,
            letterSpacing: "-0.025em",
            margin: "0 0 14px",
          }}
        >
          {idea.title}
        </h1>

        {/* Timestamps & Methodology Note */}
        <p className="research-note" style={{ margin: "0 0 20px" }}>
          Published {formatCheckedDate(idea.publishedAt)}
          {idea.updatedAt ? ` · Brief updated ${formatCheckedDate(idea.updatedAt)}` : ""}.
          A research score is an internal ranking, not a probability of demand or success.
        </p>

        {/* Top Action Strip: Shortlist Opportunity Button */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 14,
            padding: "14px 18px",
            borderRadius: "var(--r-md)",
            background: "rgba(0, 0, 0, 0.25)",
            border: "1px solid var(--line)",
          }}
        >
          <div>
            <div style={{ fontSize: 13.5, fontWeight: 600, color: "var(--ink)", marginBottom: 2 }}>
              Keep this opportunity on your workspace shortlist
            </div>
            <div style={{ fontSize: 12, color: "var(--ink-soft)" }}>
              Save it to your account to track revisions when evidence changes.
            </div>
          </div>
          <OpportunityWatchButton
            slug={idea.slug}
            signedIn={Boolean(viewer.userId)}
            initialFollowing={Boolean(watch)}
            evidenceChanged={Boolean(watch && watch.evidenceFingerprint !== evidenceFingerprint(idea.evidence))}
          />
        </div>
      </div>

      {/* Two-Column Desktop Dossier Layout */}
      <div className="dossier-layout">
        {/* Left TOC Rail (Desktop Only) */}
        <aside className="dossier-toc" aria-label="Table of contents">
          <div
            style={{
              fontFamily: "var(--font-jetbrains-mono), monospace",
              fontSize: 10.5,
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.06em",
              color: "var(--violet-deep)",
              marginBottom: 12,
              paddingBottom: 8,
              borderBottom: "1px solid var(--line)",
            }}
          >
            Dossier Navigation
          </div>
          <nav style={{ display: "flex", flexDirection: "column", gap: 3 }}>
            <a href="#problem">1. Problem & Persona</a>
            <a href="#economics">2. Economic Severity</a>
            <a href="#evidence">3. Evidence ({idea.evidence.length})</a>
            <a href="#graph">4. Solution Graph</a>
            <a href="#competition">5. Competition</a>
            <a href="#validation">6. Buyer Validation</a>
            <a href="#build-brief">7. Turnkey Build Loop</a>
            <a href="#category">8. Related Drops</a>
          </nav>

          {/* Micro Telemetry Widget */}
          <div
            style={{
              marginTop: 20,
              paddingTop: 16,
              borderTop: "1px solid var(--line)",
              fontSize: 11.5,
              color: "var(--ink-soft)",
              display: "flex",
              flexDirection: "column",
              gap: 8,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span>Signals:</span>
              <strong style={{ color: "var(--ink)" }}>{idea.evidence.length} validated</strong>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span>Tier:</span>
              <strong style={{ color: "var(--ink)", textTransform: "uppercase" }}>{idea.tier}</strong>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span>Status:</span>
              <span style={{ color: "#34D399", fontWeight: 600 }}>Active</span>
            </div>
          </div>
        </aside>

        {/* Right Main Dossier Column */}
        <div style={{ minWidth: 0 }}>
          {/* Section 1: Problem & Target Persona */}
          <section id="problem" className="dossier-card-box">
            <div className="eyebrow">Problem & Target Persona</div>
            <p style={{ margin: "0 0 10px", fontSize: 16, lineHeight: 1.6, color: "var(--ink)" }}>
              {idea.problem.summary}
            </p>
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                padding: "8px 14px",
                borderRadius: "var(--r-sm)",
                background: "rgba(255, 255, 255, 0.04)",
                border: "1px solid var(--line)",
                fontSize: 13,
                color: "var(--ink-soft)",
              }}
            >
              <strong style={{ color: "var(--ink)" }}>Who feels it:</strong> {idea.problem.whoFeelsIt}
            </div>
          </section>

          {/* Section 2: Economic Severity Assessment */}
          <section id="economics" style={{ marginBottom: 24 }}>
            <EconomicSeverityCard assessment={economicAssessment} />
          </section>

          {/* Section 3: Triangulated Evidence */}
          <section id="evidence" className="dossier-card-box">
            <div className="eyebrow">
              Triangulated Evidence · {idea.evidence.length} source{idea.evidence.length === 1 ? "" : "s"}
            </div>
            <p className="research-note" style={{ margin: "4px 0 14px" }}>
              {summary.entries} entries · {summary.uniqueUrls} distinct URLs · {summary.repeatedUrls} repeated URLs.
              Distinct URLs and platform counts do not establish independent buyers. Cross-posts and shared authors have
              not been audited. Source dates are original post dates, not last-verified dates.
            </p>

            {triangulation ? (
              <div style={{ margin: "0 0 16px" }}>
                <TriangulationBadge stats={triangulation.stats} />
              </div>
            ) : null}

            {/* Structured Dark Obsidian Evidence Cards */}
            <div style={{ display: "flex", flexDirection: "column", gap: 14, marginTop: 12 }}>
              {idea.evidence.map((e, i) => (
                <div
                  key={i}
                  style={{
                    background: "var(--bg)",
                    border: "1px solid var(--line)",
                    borderRadius: "var(--r-md)",
                    padding: "16px 18px",
                    display: "flex",
                    flexDirection: "column",
                    gap: 10,
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span
                        style={{
                          fontFamily: "var(--font-jetbrains-mono), monospace",
                          fontSize: 10.5,
                          fontWeight: 700,
                          textTransform: "uppercase",
                          letterSpacing: "0.04em",
                          padding: "3px 8px",
                          borderRadius: "var(--r-chip)",
                          background: "rgba(124, 58, 237, 0.16)",
                          color: "var(--violet-deep)",
                          border: "1px solid rgba(124, 58, 237, 0.3)",
                        }}
                      >
                        {e.platform}
                      </span>
                      {e.subforum && (
                        <span
                          style={{
                            fontFamily: "var(--font-jetbrains-mono), monospace",
                            fontSize: 11,
                            color: "var(--ink-soft)",
                          }}
                        >
                          {e.subforum}
                        </span>
                      )}
                    </div>
                    <span
                      style={{
                        fontSize: 11.5,
                        fontFamily: "var(--font-jetbrains-mono), monospace",
                        color: "var(--ink-soft)",
                      }}
                    >
                      {Number.isFinite(Date.parse(e.date)) ? formatCheckedDate(e.date) : "Date unrecorded"}
                    </span>
                  </div>

                  <blockquote
                    style={{
                      margin: 0,
                      fontSize: 14,
                      lineHeight: 1.6,
                      color: "var(--ink)",
                      borderLeft: "3px solid var(--violet)",
                      paddingLeft: 12,
                      fontStyle: "italic",
                    }}
                  >
                    &ldquo;{e.quote}&rdquo;
                  </blockquote>

                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      flexWrap: "wrap",
                      gap: 8,
                      paddingTop: 8,
                      borderTop: "1px solid rgba(255, 255, 255, 0.05)",
                    }}
                  >
                    {e.engagementMetric ? (
                      <span
                        style={{
                          fontSize: 11,
                          color: "var(--ink-soft)",
                          fontFamily: "var(--font-jetbrains-mono), monospace",
                        }}
                      >
                        {e.engagementMetric.type}: {e.engagementMetric.value}
                      </span>
                    ) : (
                      <span />
                    )}
                    <a
                      href={e.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 4,
                        fontSize: 12,
                        color: "var(--violet-deep)",
                        textDecoration: "none",
                        fontWeight: 600,
                      }}
                    >
                      <span>Inspect original source</span>
                      <span>↗</span>
                    </a>
                  </div>
                </div>
              ))}
            </div>

            {triangulation ? (
              <div style={{ marginTop: 16 }}>
                <SourceLinksList triangulation={triangulation} />
              </div>
            ) : null}
          </section>

          {/* Section 4: 3D Solution Graph */}
          <section id="graph" style={{ marginBottom: 24, overflow: "hidden" }}>
            <BriefSolutionGraph
              title={idea.title}
              evidence={idea.evidence}
              demandScore={idea.demandScore}
            />
          </section>

          {/* Section 5: Competitive Landscape */}
          <section id="competition" className="dossier-card-box">
            <CompetitiveLandscapeSection idea={idea} />
          </section>

          {/* Section 6: Buyer Validation Walkthrough */}
          <section id="validation" className="dossier-card-box">
            <div className="eyebrow">Validation Protocol</div>
            <h2 className="research-heading" style={{ fontSize: 18, margin: "0 0 10px" }}>
              Test the buyer before the build
            </h2>
            <p style={{ margin: "0 0 12px", fontSize: 14.5, lineHeight: 1.6, color: "var(--ink-soft)" }}>
              Start with <strong style={{ color: "var(--ink)" }}>{idea.problem.whoFeelsIt}</strong>. Ask a consenting
              prospective user to show their last workaround, its cost, and what they have already tried. Compare the
              current alternatives before proposing the smallest useful workflow.
            </p>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                gap: 12,
                marginTop: 16,
                marginBottom: 16,
              }}
            >
              <div style={{ padding: "12px 14px", borderRadius: "var(--r-sm)", background: "rgba(16, 185, 129, 0.08)", border: "1px solid rgba(16, 185, 129, 0.2)" }}>
                <strong style={{ color: "#34D399", display: "block", fontSize: 13, marginBottom: 4 }}>✓ Continue</strong>
                <span style={{ fontSize: 12, color: "var(--ink-soft)" }}>After concrete commitment to pilot test a minimal prototype.</span>
              </div>
              <div style={{ padding: "12px 14px", borderRadius: "var(--r-sm)", background: "rgba(245, 158, 11, 0.08)", border: "1px solid rgba(245, 158, 11, 0.2)" }}>
                <strong style={{ color: "#FBBF24", display: "block", fontSize: 13, marginBottom: 4 }}>↻ Pivot</strong>
                <span style={{ fontSize: 12, color: "var(--ink-soft)" }}>If an adjacent, narrower operational friction dominates conversations.</span>
              </div>
              <div style={{ padding: "12px 14px", borderRadius: "var(--r-sm)", background: "rgba(255, 94, 126, 0.08)", border: "1px solid rgba(255, 94, 126, 0.2)" }}>
                <strong style={{ color: "#FF5E7E", display: "block", fontSize: 13, marginBottom: 4 }}>✕ Stop</strong>
                <span style={{ fontSize: 12, color: "var(--ink-soft)" }}>If existing workarounds are &quot;good enough&quot; and churn friction is negligible.</span>
              </div>
            </div>
            <Link href="/#sample" style={{ fontSize: 13, color: "var(--violet-deep)", fontWeight: 600 }}>
              Read the complete sample and validation walkthrough →
            </Link>
          </section>

          {/* Section 7: Turnkey Build Brief & Gated Zone */}
          <section id="build-brief">
            <div className="gated-zone">
              {access.kind === "signed-out" ? (
                <div
                  className="locked-preview-container"
                  style={{
                    position: "relative",
                    overflow: "hidden",
                    borderRadius: 16,
                    border: "1px solid var(--line)",
                  }}
                >
                  <div
                    style={{
                      filter: "blur(5px)",
                      opacity: 0.4,
                      pointerEvents: "none",
                      padding: "24px 28px",
                      userSelect: "none",
                    }}
                    aria-hidden="true"
                  >
                    <div className="eyebrow" style={{ color: "var(--violet)" }}>Build brief · Core loop</div>
                    <p style={{ fontWeight: 600 }}>1. Connect user accounts and normalize multi-source transaction records</p>
                    <p>2. Automatically generate branded, client-ready financial PDF statements</p>
                    <div style={{ height: 16 }} />
                    <div className="eyebrow" style={{ color: "var(--violet)" }}>PostgreSQL DDL & Prisma Schema</div>
                    <div
                      style={{
                        background: "#15161A",
                        height: 100,
                        borderRadius: 8,
                        padding: 12,
                        color: "#fff",
                        fontFamily: "monospace",
                        fontSize: 12,
                      }}
                    >
                      CREATE TABLE clients ( id UUID PRIMARY KEY, name TEXT NOT NULL );
                    </div>
                  </div>
                  <div
                    style={{
                      position: "absolute",
                      inset: 0,
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      background: "rgba(10, 12, 18, 0.88)",
                      backdropFilter: "blur(6px)",
                      padding: 24,
                      textAlign: "center",
                    }}
                  >
                    <span style={{ fontSize: 24, marginBottom: 8 }}>🔒</span>
                    <h3 style={{ margin: "0 0 6px", fontSize: 18, fontWeight: 700 }}>Full Build Brief Gated</h3>
                    <p style={{ margin: "0 0 16px", fontSize: 14, color: "var(--ink-soft)", maxWidth: 440 }}>
                      Sign in to unlock the full build loop, turnkey agent prompts (Claude Code, Cursor, v0), matched APIs, and instant database DDL schema.
                    </p>
                    <Link
                      href={`/login?next=${encodeURIComponent(`/feed/${scoped.slug}`)}`}
                      className="btn btn-primary"
                      style={{ padding: "8px 20px" }}
                    >
                      Sign in to unlock
                    </Link>
                  </div>
                </div>
              ) : access.kind === "quota-locked" ? (
                <div className="locked-callout">
                  <p style={{ margin: "0 0 14px", fontSize: 14, color: "var(--ink-soft)" }}>
                    You&apos;ve used all {access.quota.quota} of your full idea{access.quota.quota === 1 ? "" : "s"} this
                    month. Resets{" "}
                    {new Date(nextQuotaResetIso()).toLocaleDateString("en-US", { month: "long", day: "numeric" })}.
                  </p>
                  <Link href="/#pricing" className="btn btn-primary">
                    Upgrade for more
                  </Link>
                  <p style={{ marginTop: 12 }}>
                    <Link href="/#sample">Inspect the complete free sample first →</Link>
                  </p>
                </div>
              ) : access.kind === "tier-locked" ? (
                <div
                  className="locked-preview-container"
                  style={{
                    position: "relative",
                    overflow: "hidden",
                    borderRadius: 16,
                    border: "1px solid var(--line)",
                  }}
                >
                  <div
                    style={{
                      filter: "blur(5px)",
                      opacity: 0.4,
                      pointerEvents: "none",
                      padding: "24px 28px",
                      userSelect: "none",
                    }}
                    aria-hidden="true"
                  >
                    <div className="eyebrow" style={{ color: "var(--violet)" }}>Turnkey Agent Prompts · Claude Code & Cursor</div>
                    <p style={{ fontWeight: 600 }}>Ready-to-paste build prompts with step constraints and zero-slop specifications</p>
                    <div style={{ height: 16 }} />
                    <div className="eyebrow" style={{ color: "var(--violet)" }}>Matched APIs & Free-tier Limits</div>
                    <div
                      style={{
                        background: "var(--surface-elevated)",
                        height: 80,
                        borderRadius: 8,
                        padding: 12,
                        border: "1px solid var(--line)",
                      }}
                    >
                      Verified API documentation links, endpoint rate limits, and authentication patterns
                    </div>
                  </div>
                  <div
                    style={{
                      position: "absolute",
                      inset: 0,
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      background: "rgba(10, 12, 18, 0.88)",
                      backdropFilter: "blur(6px)",
                      padding: 24,
                      textAlign: "center",
                    }}
                  >
                    <span style={{ fontSize: 24, marginBottom: 8 }}>🔒</span>
                    <h3 style={{ margin: "0 0 6px", fontSize: 18, fontWeight: 700 }}>Available on Builder & Studio</h3>
                    <p style={{ margin: "0 0 16px", fontSize: 14, color: "var(--ink-soft)", maxWidth: 440 }}>
                      Unlock this brief, DDL database schemas, and turnkey Cursor/.cursorrules exports with the Builder plan.
                    </p>
                    <Link href="/#pricing" className="btn btn-primary" style={{ padding: "8px 20px" }}>
                      {isUsd ? "Unlock with Builder ($4.80/mo)" : "Unlock with Builder (₹399/mo)"}
                    </Link>
                    <p style={{ marginTop: 12 }}>
                      <Link href="/#sample">Read the complete free sample first →</Link>
                    </p>
                  </div>
                </div>
              ) : (
                <FullBrief idea={scoped as IdeaDrop} subscriberId={viewer.subscriberId ?? undefined} />
              )}
            </div>
          </section>

          {/* Section 8: Category & Related Ideas */}
          <section id="category" className="dossier-card-box" style={{ marginTop: 24 }}>
            <div className="eyebrow">Category Clusters</div>
            <div className="facet-chip-list">
              <Link href={`/category/${categorySlug}`} className="facet-chip">
                More {idea.category} ideas →
              </Link>
              {platformSlugs.map((p) => (
                <Link key={p} href={`/platform/${slugify(p)}`} className="facet-chip">
                  {PLATFORM_LABELS[p] ?? p} ideas →
                </Link>
              ))}
              <Link href={`/rejected?category=${categorySlug}`} className="facet-chip">
                Rejected {idea.category} clusters →
              </Link>
            </div>

            {relatedIdeas.length > 0 && (
              <div style={{ marginTop: 24, paddingTop: 20, borderTop: "1px solid var(--line)" }}>
                <div className="eyebrow" style={{ marginBottom: 10 }}>Related Drops in this Space</div>
                <div className="related-grid">
                  {relatedIdeas.map((r) => (
                    <Link key={r.id} href={`/feed/${r.slug}`} className="related-card">
                      <h4>{r.title}</h4>
                      <p>{truncate(r.problem.summary, 90)}</p>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}

function SourceLinksList({ triangulation }: { triangulation: Triangulation }) {
  return (
    <ul className="source-links-list">
      {triangulation.sources.map((s, i) => (
        <li key={i}>
          <a href={s.url} target="_blank" rel="noopener noreferrer">
            <span className="src-platform">{s.source}</span>
            {s.title ? <span>{truncate(s.title, 60)}</span> : null}
          </a>
        </li>
      ))}
    </ul>
  );
}

function BriefJsonLd({ idea, access }: { idea: IdeaDrop; access: IdeaAccess["kind"] }) {
  const url = absoluteUrl(`/feed/${idea.slug}`);
  const logoUrl = absoluteUrl("/apple-icon");
  const base = {
    "@context": "https://schema.org",
    headline: idea.title,
    description: idea.problem.summary,
    image: [absoluteUrl(`/feed/${idea.slug}/opengraph-image`)],
    datePublished: new Date(idea.publishedAt).toISOString(),
    ...(idea.updatedAt ? { dateModified: idea.updatedAt } : {}),
    url,
    author: { "@type": "Organization", name: "Sourced", url: "https://www.getsourced.dev" },
    publisher: {
      "@type": "Organization",
      name: "Sourced",
      url: "https://www.getsourced.dev",
      logo: { "@type": "ImageObject", url: logoUrl },
    },
    isAccessibleForFree: true,
    hasPart: {
      "@type": "WebPageElement",
      isAccessibleForFree: false,
      cssSelector: ".gated-zone",
    },
  };

  const json =
    access === "full"
      ? {
          ...base,
          "@type": "HowTo",
          name: idea.title,
          step: idea.buildBrief.coreLoop.map((text, i) => ({
            "@type": "HowToStep",
            position: i + 1,
            text,
          })),
        }
      : { ...base, "@type": "Article" };

  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(json) }} />;
}

function formatCheckedDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}

function CompetitiveLandscapeSection({ idea }: { idea: IdeaDrop }) {
  if (!idea.competitiveLandscape) {
    return (
      <div>
        <div className="eyebrow">Competitive Landscape</div>
        <h2 className="research-heading" style={{ fontSize: 18, margin: "0 0 8px" }}>Alternatives not yet checked</h2>
        <p style={{ margin: 0, fontSize: 14, color: "var(--ink-soft)" }}>
          There is no recorded competitive research for this brief. Check current products and workarounds before treating it as an opening.
        </p>
      </div>
    );
  }
  const landscape = idea.competitiveLandscape;

  return (
    <div>
      <div className="eyebrow">Competitive Landscape</div>
      {landscape.verdict === "no_direct_competitor" ? (
        <p style={{ margin: 0, fontSize: 14.5, lineHeight: 1.6 }}>
          The recorded search did not identify a direct competitor as of {formatCheckedDate(landscape.checkedAt)}. This is a search limitation, not proof that none exists.
        </p>
      ) : (
        <>
          <ul className="brief-list" style={{ marginTop: 8 }}>
            {landscape.existingSolutions.map((s, i) => (
              <li key={i}>
                <a
                  href={s.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: "var(--violet-deep)", fontWeight: 600 }}
                >
                  {s.name}
                </a>{" "}
                — {s.gap}
              </li>
            ))}
          </ul>
          <p style={{ margin: "6px 0 0", fontSize: 13, color: "var(--ink-soft)" }}>
            Here&apos;s what exists and where the opening is.
          </p>
        </>
      )}
      <p className="mono" style={{ margin: "10px 0 0", fontSize: 11.5, color: "var(--ink-soft)" }}>
        Checked {formatCheckedDate(landscape.checkedAt)}
      </p>
      <p className="research-note" style={{ marginTop: 8 }}>
        Recorded search: {landscape.searchQueryUsed}. Automated results can include irrelevant alternatives; inspect the links and verify feature claims before relying on the suggested gap.
      </p>
    </div>
  );
}

function FullBrief({ idea, subscriberId }: { idea: IdeaDrop; subscriberId?: string }) {
  const outreachPack = generateOutreachPack(idea);
  const subId = subscriberId ?? "subscriber";
  const contractMarkdown = applyWatermark(generateProductionContract(idea), subId, idea.slug, "markdown");
  const cursorRules = applyWatermark(generateCursorRules(idea), subId, idea.slug, "javascript");
  const sqlSchema = applyWatermark(generateSqlSchema(idea), subId, idea.slug, "sql");
  const fingerprint = generateLicenseFingerprint(subId, idea.slug);

  return (
    <>
      <div className="dossier-card-box">
        <div className="eyebrow">Why now</div>
        <p style={{ margin: 0, fontSize: 14.5, lineHeight: 1.6 }}>{idea.whyNow}</p>
      </div>

      <div className="dossier-card-box">
        <div className="eyebrow">Turnkey Build Brief</div>
        <h5 style={{ fontSize: 14, fontWeight: 700, margin: "12px 0 6px" }}>Core Loop Execution</h5>
        <ol className="brief-list" style={{ lineHeight: 1.65 }}>
          {idea.buildBrief.coreLoop.map((step, i) => (
            <li key={i} style={{ marginBottom: 6 }}>{step}</li>
          ))}
        </ol>
        <h5 style={{ fontSize: 14, fontWeight: 700, margin: "16px 0 6px" }}>MVP Scope</h5>
        <ul className="brief-list" style={{ lineHeight: 1.65 }}>
          {idea.buildBrief.mvpScope.map((item, i) => (
            <li key={i} style={{ marginBottom: 4 }}>{item}</li>
          ))}
        </ul>
        <h5 style={{ fontSize: 14, fontWeight: 700, margin: "16px 0 6px" }}>Explicitly Cut</h5>
        <ul className="brief-list" style={{ color: "var(--ink-soft)", lineHeight: 1.65 }}>
          {idea.buildBrief.explicitlyCut.map((item, i) => (
            <li key={i} style={{ marginBottom: 4 }}>{item}</li>
          ))}
        </ul>
      </div>

      {outreachPack.items.length > 0 && <OutreachPackPanel pack={outreachPack} />}

      <div className="dossier-card-box">
        <div className="eyebrow">Matched APIs</div>
        <ul className="brief-list" style={{ lineHeight: 1.65 }}>
          {idea.matchedApis.map((api, i) => (
            <li key={i} style={{ marginBottom: 6 }}>
              <a href={api.sourceUrl} target="_blank" rel="noopener noreferrer" style={{ color: "var(--violet-deep)", fontWeight: 600 }}>
                {api.name}
              </a>{" "}
              — {api.purpose} ({api.freeTierLimit})
            </li>
          ))}
        </ul>
      </div>

      <div className="dossier-card-box">
        <div className="eyebrow">Launch Stack</div>
        <ul className="brief-list" style={{ lineHeight: 1.65 }}>
          {idea.launchStack.map((item, i) => (
            <li key={i} style={{ marginBottom: 6 }}>
              <strong>{item.layer}:</strong> {item.tool} — {item.freeTierNote}
            </li>
          ))}
        </ul>
      </div>

      <div className="dossier-card-box">
        <div className="eyebrow">Agent Prompts & Builder Export</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 12 }}>
          <CopyPromptButton label="Claude Code" prompt={idea.agentPrompts.claudeCode} />
          <CopyPromptButton label="Cursor / Windsurf" prompt={idea.agentPrompts.cursorWindsurf} />
          <CopyPromptButton label="v0 / Bolt" prompt={idea.agentPrompts.v0Bolt} />
        </div>

        <div style={{ marginTop: 18 }}>
          <BuilderExportPanel
            slug={idea.slug}
            contractMarkdown={contractMarkdown}
            cursorRules={cursorRules}
            sqlSchema={sqlSchema}
          />
        </div>

        <div
          style={{
            marginTop: 18,
            padding: "10px 14px",
            background: "rgba(0, 0, 0, 0.2)",
            border: "1px solid var(--line)",
            borderRadius: "var(--r-sm)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 8,
            fontSize: 11.5,
            color: "var(--ink-soft)",
          }}
        >
          <span>
            🔒 Verified License Fingerprint:{" "}
            <span className="mono" style={{ color: "var(--ink)", fontWeight: 600 }}>
              {fingerprint}
            </span>
          </span>
          <span>Redistribution or automated scraping strictly prohibited</span>
        </div>
      </div>
    </>
  );
}
