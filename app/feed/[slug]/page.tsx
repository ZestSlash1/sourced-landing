import Link from "next/link";
import { notFound } from "next/navigation";
import { getPublishedIdeaByIdOrSlug } from "@/lib/idea-drops/repository";
import { resolveUserTier } from "@/lib/idea-drops/resolve-user-tier";
import { scopeToTier } from "@/lib/idea-drops/scope-to-tier";
import type { IdeaDrop } from "@/types/idea-drop";
import CopyPromptButton from "./copy-prompt-button";

export const dynamic = "force-dynamic";

const sectionStyle: React.CSSProperties = { marginBottom: 28 };
const labelStyle: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 600,
  color: "var(--ink-soft)",
  textTransform: "uppercase",
  letterSpacing: "0.04em",
  marginBottom: 8,
};

export default async function IdeaDetailPage({ params }: { params: { slug: string } }) {
  const idea = await getPublishedIdeaByIdOrSlug(params.slug);
  if (!idea) notFound();

  const userTier = await resolveUserTier();
  const scoped = scopeToTier(idea, userTier);
  const locked = "locked" in scoped && scoped.locked;

  return (
    <main style={{ maxWidth: 720, margin: "0 auto", padding: "40px 24px" }}>
      <Link href="/feed" style={{ fontSize: 13, color: "var(--ink-soft)", textDecoration: "none" }}>
        ← Back to feed
      </Link>

      <div style={{ margin: "16px 0 4px", fontSize: 12, fontWeight: 600, color: "var(--violet)" }}>
        {scoped.category} · {scoped.demandScore}% demand
      </div>
      <h1 className="display" style={{ fontSize: 26, margin: "0 0 20px" }}>
        {scoped.title}
      </h1>

      <div style={sectionStyle}>
        <div style={labelStyle}>Problem</div>
        <p style={{ margin: 0, fontSize: 15 }}>{scoped.problem.summary}</p>
        <p style={{ margin: "6px 0 0", fontSize: 13, color: "var(--ink-soft)" }}>
          {scoped.problem.whoFeelsIt}
        </p>
      </div>

      <div style={sectionStyle}>
        <div style={labelStyle}>Evidence</div>
        <ul style={{ margin: 0, paddingLeft: 18, fontSize: 14 }}>
          {scoped.evidence.map((e, i) => (
            <li key={i} style={{ marginBottom: 6 }}>
              <a href={e.url} target="_blank" rel="noopener noreferrer" style={{ color: "var(--violet)" }}>
                {e.platform}
                {e.subforum ? ` · ${e.subforum}` : ""}
              </a>{" "}
              — {e.quote}
            </li>
          ))}
        </ul>
      </div>

      {locked ? (
        <div
          style={{
            border: "1px solid var(--line)",
            borderRadius: "var(--r-sm)",
            padding: "24px 20px",
            textAlign: "center",
          }}
        >
          <p style={{ margin: "0 0 12px", fontSize: 14, color: "var(--ink-soft)" }}>
            The full build brief, matched APIs, launch stack, and ready-to-paste agent prompts
            unlock on {scoped.tier === "builder" ? "Builder" : "Studio"}.
          </p>
          <Link
            href="/#pricing"
            style={{
              display: "inline-block",
              padding: "10px 20px",
              background: "var(--violet)",
              color: "#fff",
              borderRadius: "var(--r-sm)",
              fontWeight: 600,
              fontSize: 14,
              textDecoration: "none",
            }}
          >
            See plans
          </Link>
        </div>
      ) : (
        <FullBrief idea={scoped as IdeaDrop} />
      )}
    </main>
  );
}

function FullBrief({ idea }: { idea: IdeaDrop }) {
  return (
    <>
      <div style={sectionStyle}>
        <div style={labelStyle}>Why now</div>
        <p style={{ margin: 0, fontSize: 14 }}>{idea.whyNow}</p>
      </div>

      <div style={sectionStyle}>
        <div style={labelStyle}>Build brief</div>
        <p style={{ fontSize: 13, fontWeight: 600, margin: "0 0 4px" }}>Core loop</p>
        <ol style={{ margin: "0 0 12px", paddingLeft: 18, fontSize: 14 }}>
          {idea.buildBrief.coreLoop.map((step, i) => (
            <li key={i}>{step}</li>
          ))}
        </ol>
        <p style={{ fontSize: 13, fontWeight: 600, margin: "0 0 4px" }}>MVP scope</p>
        <ul style={{ margin: "0 0 12px", paddingLeft: 18, fontSize: 14 }}>
          {idea.buildBrief.mvpScope.map((item, i) => (
            <li key={i}>{item}</li>
          ))}
        </ul>
        <p style={{ fontSize: 13, fontWeight: 600, margin: "0 0 4px" }}>Explicitly cut</p>
        <ul style={{ margin: 0, paddingLeft: 18, fontSize: 14, color: "var(--ink-soft)" }}>
          {idea.buildBrief.explicitlyCut.map((item, i) => (
            <li key={i}>{item}</li>
          ))}
        </ul>
      </div>

      <div style={sectionStyle}>
        <div style={labelStyle}>Matched APIs</div>
        <ul style={{ margin: 0, paddingLeft: 18, fontSize: 14 }}>
          {idea.matchedApis.map((api, i) => (
            <li key={i} style={{ marginBottom: 4 }}>
              <a href={api.sourceUrl} target="_blank" rel="noopener noreferrer" style={{ color: "var(--violet)" }}>
                {api.name}
              </a>{" "}
              — {api.purpose} ({api.freeTierLimit})
            </li>
          ))}
        </ul>
      </div>

      <div style={sectionStyle}>
        <div style={labelStyle}>Launch stack</div>
        <ul style={{ margin: 0, paddingLeft: 18, fontSize: 14 }}>
          {idea.launchStack.map((item, i) => (
            <li key={i} style={{ marginBottom: 4 }}>
              <strong>{item.layer}:</strong> {item.tool} — {item.freeTierNote}
            </li>
          ))}
        </ul>
      </div>

      <div style={sectionStyle}>
        <div style={labelStyle}>Agent prompts</div>
        <CopyPromptButton label="Claude Code" prompt={idea.agentPrompts.claudeCode} />
        <CopyPromptButton label="Cursor / Windsurf" prompt={idea.agentPrompts.cursorWindsurf} />
        <CopyPromptButton label="v0 / Bolt" prompt={idea.agentPrompts.v0Bolt} />
      </div>
    </>
  );
}
