import Link from "next/link";
import { notFound } from "next/navigation";
import { getPublishedIdeaByIdOrSlug } from "@/lib/idea-drops/repository";
import { nextQuotaResetIso } from "@/lib/idea-drops/quota";
import { resolveAndRecordAccess, resolveViewerContext } from "@/lib/idea-drops/resolve-access";
import type { IdeaDrop } from "@/types/idea-drop";
import CopyPromptButton from "./copy-prompt-button";

export const dynamic = "force-dynamic";

export default async function IdeaDetailPage({ params }: { params: { slug: string } }) {
  const idea = await getPublishedIdeaByIdOrSlug(params.slug);
  if (!idea) notFound();

  const viewer = await resolveViewerContext();
  const access = await resolveAndRecordAccess(idea, viewer);
  const scoped = access.idea;

  return (
    <main className="app-shell">
      <Link href="/feed" className="back-link">
        ← Back to feed
      </Link>

      <div style={{ marginTop: 20 }}>
        <div className="brief-cover">
          <span className="tag">{scoped.category}</span>
          <span className="score">{scoped.demandScore}% demand</span>
        </div>
        <div className="brief-body">
          <h1 className="brief-title display">{scoped.title}</h1>

          <div className="brief-section">
            <div className="eyebrow">Problem</div>
            <p style={{ margin: 0, fontSize: 15 }}>{scoped.problem.summary}</p>
            <p style={{ margin: "6px 0 0", fontSize: 13, color: "var(--ink-soft)" }}>{scoped.problem.whoFeelsIt}</p>
          </div>

          <div className="brief-section">
            <div className="eyebrow">Evidence</div>
            <ul className="evidence-list">
              {scoped.evidence.map((e, i) => (
                <li key={i} className="evidence-item">
                  <a href={e.url} target="_blank" rel="noopener noreferrer">
                    {e.platform}
                    {e.subforum ? ` · ${e.subforum}` : ""}
                  </a>{" "}
                  — {e.quote}
                </li>
              ))}
            </ul>
          </div>

          {access.kind === "quota-locked" ? (
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
    </main>
  );
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
