import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getPublishedIdeaByIdOrSlug } from "@/lib/idea-drops/repository";
import { nextQuotaResetIso } from "@/lib/idea-drops/quota";
import { resolveAndRecordAccess, resolveViewerContext } from "@/lib/idea-drops/resolve-access";
import type { IdeaAccess } from "@/lib/idea-drops/resolve-access";
import { getTriangulation, type Triangulation } from "@/lib/idea-drops/triangulation";
import type { IdeaDrop } from "@/types/idea-drop";
import { absoluteUrl, truncate } from "@/lib/seo";
import CopyPromptButton from "./copy-prompt-button";
import TriangulationBadge from "../triangulation-badge";

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

  return (
    <main className="app-shell">
      <BriefJsonLd idea={idea} access={access.kind} />

      <Link href="/feed" className="back-link">
        ← Back to feed
      </Link>

      <div style={{ marginTop: 20 }}>
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

          <div className="gated-zone">
            {access.kind === "signed-out" ? (
              <div className="locked-callout">
                <p style={{ margin: "0 0 14px", fontSize: 14, color: "var(--ink-soft)" }}>
                  Sign in for free to view the full build brief, matched APIs, launch stack, and ready-to-paste agent
                  prompts.
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
                  The full build brief, matched APIs, launch stack, and ready-to-paste agent prompts unlock on{" "}
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
  const base = {
    "@context": "https://schema.org",
    headline: idea.title,
    description: idea.problem.summary,
    datePublished: idea.publishedAt,
    ...(idea.updatedAt ? { dateModified: idea.updatedAt } : {}),
    url,
    author: { "@type": "Organization", name: "Sourced", url: "https://www.getsourced.dev" },
    publisher: { "@type": "Organization", name: "Sourced", url: "https://www.getsourced.dev" },
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

function FullBrief({ idea }: { idea: IdeaDrop }) {
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
        <div className="eyebrow">Agent prompts</div>
        <CopyPromptButton label="Claude Code" prompt={idea.agentPrompts.claudeCode} />
        <CopyPromptButton label="Cursor / Windsurf" prompt={idea.agentPrompts.cursorWindsurf} />
        <CopyPromptButton label="v0 / Bolt" prompt={idea.agentPrompts.v0Bolt} />
      </div>
    </>
  );
}
