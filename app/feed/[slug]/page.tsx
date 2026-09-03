import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
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
import EconomicSeverityCard from "./economic-severity-card";
import OutreachPackPanel from "./outreach-pack-panel";
import SpecContractPanel from "./spec-contract-panel";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const idea = await getPublishedIdeaByIdOrSlug(params.slug);
  if (!idea) {
    return { title: "Brief not found", robots: { index: false, follow: false } };
  }

  const description = truncate(idea.problem.summary, 155);
  const url = absoluteUrl(`/feed/${idea.slug}`);

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
    },
    twitter: {
      card: "summary_large_image",
      title: idea.title,
      description,
    },
  };
}

export default async function IdeaDetailPage({ params }: { params: { slug: string } }) {
  const idea = await getPublishedIdeaByIdOrSlug(params.slug);
  if (!idea) notFound();

  const viewer = await resolveViewerContext();
  // Access governs only the gated zone below (build brief, matched APIs, launch
  // stack, agent prompts) and is the only thing that touches quota — problem
  // and evidence are rendered straight from `idea`, unscoped, for every viewer.
  const access = await resolveAndRecordAccess(idea, viewer);
  const scoped = access.idea;
  const triangulation = await getTriangulation(idea.sourceSignalIds);
  const relatedIdeas = await listPublishedIdeasByCategory(idea.category, { excludeId: idea.id, limit: 3 });
  const categorySlug = slugify(idea.category);
  const platformSlugs = Array.from(new Set(idea.evidence.map((e) => e.platform)));

  const economicAssessment = computeEconomicAssessment(idea);

  return (
    <main className="app-shell">
      <BriefJsonLd idea={idea} access={access.kind} />
      {access.kind === "full" && access.freshUnlock && <UnlockTracker slug={idea.slug} />}

      <Link href="/feed" className="back-link">
        ← Back to feed
      </Link>

      <div style={{ marginTop: 20 }}>
        <Breadcrumbs
          items={[
            { name: idea.category, path: `/category/${categorySlug}` },
            { name: idea.title, path: `/feed/${idea.slug}` },
          ]}
        />
        <div className="brief-cover">
          <span className="tag">{idea.category}</span>
          <span className="score">{idea.demandScore}% demand</span>
        </div>
        <div className="brief-body">
          <h1 className="brief-title display">{idea.title}</h1>

          <div className="brief-section">
            <div className="eyebrow">Problem</div>
            <p style={{ margin: 0, fontSize: 15 }}>{idea.problem.summary}</p>
            <p style={{ margin: "6px 0 0", fontSize: 13, color: "var(--ink-soft)" }}>{idea.problem.whoFeelsIt}</p>
          </div>

          <EconomicSeverityCard assessment={economicAssessment} />

          <div className="brief-section">
            <div className="eyebrow">Evidence · {idea.evidence.length} source{idea.evidence.length === 1 ? "" : "s"}</div>
            {triangulation ? (
              <div style={{ margin: "0 0 12px" }}>
                <TriangulationBadge stats={triangulation.stats} />
              </div>
            ) : null}
            <ul className="evidence-list">
              {idea.evidence.map((e, i) => (
                <li key={i} className="evidence-item">
                  <a href={e.url} target="_blank" rel="noopener noreferrer">
                    {e.platform}
                    {e.subforum ? ` · ${e.subforum}` : ""}
                  </a>{" "}
                  — {e.quote}
                </li>
              ))}
            </ul>
            {triangulation ? <SourceLinksList triangulation={triangulation} /> : null}
          </div>

          <CompetitiveLandscapeSection idea={idea} />

          <div className="brief-section">
            <div className="eyebrow">In this category</div>
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
          </div>

          {relatedIdeas.length > 0 ? (
            <div className="brief-section">
              <div className="eyebrow">Related ideas</div>
              <div className="related-grid">
                {relatedIdeas.map((r) => (
                  <Link key={r.id} href={`/feed/${r.slug}`} className="related-card">
                    <h4>{r.title}</h4>
                    <p>{truncate(r.problem.summary, 90)}</p>
                  </Link>
                ))}
              </div>
            </div>
          ) : null}

          <div className="gated-zone">
            {access.kind === "signed-out" ? (
              <div className="locked-callout">
                <p style={{ margin: "0 0 14px", fontSize: 14, color: "var(--ink-soft)" }}>
                  Sign in for free to view the full build brief, Day-1 customer outreach pack, matched APIs, and spec-driven agent contracts.
                </p>
                <Link href={`/login?next=${encodeURIComponent(`/feed/${scoped.slug}`)}`} className="btn btn-primary">
                  Sign in to unlock
                </Link>
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
              </div>
            ) : access.kind === "tier-locked" ? (
              <div className="locked-callout">
                <p style={{ margin: "0 0 14px", fontSize: 14, color: "var(--ink-soft)" }}>
                  The full build brief, Day-1 customer outreach pack, launch stack, and spec-driven agent contracts unlock on{" "}
                  {scoped.tier === "builder" ? "Builder" : "Studio"}.
                </p>
                <Link href="/#pricing" className="btn btn-primary">
                  See plans
                </Link>
              </div>
            ) : (
              <FullBrief idea={scoped as IdeaDrop} />
            )}
          </div>
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

/**
 * HowTo only when the viewer's rendered HTML actually contains the steps
 * (kind === "full") — structured data must match what's visible on the page.
 * Locked viewers get Article instead, since coreLoop stays gated. Either way,
 * `hasPart` marks the gated zone (`.gated-zone`) as not free so Google can
 * index the public problem/evidence content without flagging cloaking, while
 * `isAccessibleForFree` on the root stays true since most of the page isn't
 * paywalled.
 */
function BriefJsonLd({ idea, access }: { idea: IdeaDrop; access: IdeaAccess["kind"] }) {
  const url = absoluteUrl(`/feed/${idea.slug}`);
  const logoUrl = absoluteUrl("/apple-icon");
  const base = {
    "@context": "https://schema.org",
    headline: idea.title,
    description: idea.problem.summary,
    image: [absoluteUrl(`/feed/${idea.slug}/opengraph-image`)],
    // idea.publishedAt is a bare "YYYY-MM-DD" (the DB column is `date`, not
    // timestamptz) — schema.org's datePublished wants a full ISO 8601
    // datetime with a timezone designator, same as dateModified below gets
    // for free from idea.updatedAt's timestamptz.
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

/**
 * Ungated, unlike the rest of the build brief — a real "no competitor found"
 * or "here's what exists" is itself the trust signal Sourced sells against
 * generic AI idea-generators, so it renders for every visitor regardless of
 * tier/sign-in, same rationale as Problem/Evidence above the gated zone.
 */
function CompetitiveLandscapeSection({ idea }: { idea: IdeaDrop }) {
  if (!idea.competitiveLandscape) return null;
  const landscape = idea.competitiveLandscape;

  return (
    <div className="brief-section">
      <div className="eyebrow">Competitive landscape</div>
      {landscape.verdict === "no_direct_competitor" ? (
        <p style={{ margin: 0, fontSize: 14 }}>
          No existing tool found solving this specific problem as of {formatCheckedDate(landscape.checkedAt)}.
        </p>
      ) : (
        <>
          <ul className="brief-list">
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
      <p className="mono" style={{ margin: "8px 0 0", fontSize: 11.5, color: "var(--ink-soft)" }}>
        Checked {formatCheckedDate(landscape.checkedAt)}
      </p>
    </div>
  );
}

function FullBrief({ idea }: { idea: IdeaDrop }) {
  const outreachPack = generateOutreachPack(idea);
  const contractMarkdown = generateProductionContract(idea);

  return (
    <>
      <div className="brief-section">
        <div className="eyebrow">Why now</div>
        <p style={{ margin: 0, fontSize: 14 }}>{idea.whyNow}</p>
      </div>

      <div className="brief-section">
        <div className="eyebrow">Build brief</div>
        <h5>Core loop</h5>
        <ol className="brief-list">
          {idea.buildBrief.coreLoop.map((step, i) => (
            <li key={i}>{step}</li>
          ))}
        </ol>
        <h5>MVP scope</h5>
        <ul className="brief-list">
          {idea.buildBrief.mvpScope.map((item, i) => (
            <li key={i}>{item}</li>
          ))}
        </ul>
        <h5>Explicitly cut</h5>
        <ul className="brief-list" style={{ color: "var(--ink-soft)" }}>
          {idea.buildBrief.explicitlyCut.map((item, i) => (
            <li key={i}>{item}</li>
          ))}
        </ul>
      </div>

      {outreachPack.items.length > 0 && <OutreachPackPanel pack={outreachPack} />}

      <div className="brief-section">
        <div className="eyebrow">Matched APIs</div>
        <ul className="brief-list">
          {idea.matchedApis.map((api, i) => (
            <li key={i}>
              <a href={api.sourceUrl} target="_blank" rel="noopener noreferrer" style={{ color: "var(--violet-deep)", fontWeight: 600 }}>
                {api.name}
              </a>{" "}
              — {api.purpose} ({api.freeTierLimit})
            </li>
          ))}
        </ul>
      </div>

      <div className="brief-section">
        <div className="eyebrow">Launch stack</div>
        <ul className="brief-list">
          {idea.launchStack.map((item, i) => (
            <li key={i}>
              <strong>{item.layer}:</strong> {item.tool} — {item.freeTierNote}
            </li>
          ))}
        </ul>
      </div>

      <div className="brief-section">
        <div className="eyebrow">Agent prompts & spec contract</div>
        <CopyPromptButton label="Claude Code" prompt={idea.agentPrompts.claudeCode} />
        <CopyPromptButton label="Cursor / Windsurf" prompt={idea.agentPrompts.cursorWindsurf} />
        <CopyPromptButton label="v0 / Bolt" prompt={idea.agentPrompts.v0Bolt} />
        <SpecContractPanel slug={idea.slug} contractMarkdown={contractMarkdown} />
      </div>
    </>
  );
}
