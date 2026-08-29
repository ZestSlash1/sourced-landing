import type { IdeaDrop, IdeaDropTeaser } from "@/types/idea-drop";

/**
 * Renders whatever the API actually returned — scopeToTier() decides the
 * shape server-side (lib/idea-drops/scope-to-tier.ts). This component must
 * never fetch the full idea and hide fields client-side; it only branches
 * on which shape it was given.
 */
export function IdeaCard({ idea }: { idea: IdeaDrop | IdeaDropTeaser }) {
  if ("locked" in idea) return <LockedIdeaCard idea={idea} />;
  return <FullIdeaCard idea={idea} />;
}

function LockedIdeaCard({ idea }: { idea: IdeaDropTeaser }) {
  const evidence = idea.evidence[0];
  return (
    <div className="idea-card idea-card-locked in-view">
      <div className="idea-cover cover-1">
        <span className="tag">{idea.category}</span>
        <span className="lock-icon" aria-hidden>
          🔒
        </span>
      </div>
      <div className="idea-body">
        <h4>{idea.title}</h4>
        <p className="idea-problem">{idea.problem.summary}</p>
        {evidence && (
          <p className="idea-evidence-preview">
            &ldquo;{evidence.quote}&rdquo; —{" "}
            <a href={evidence.url} target="_blank" rel="noopener noreferrer">
              {evidence.platform}
              {evidence.subforum ? ` · ${evidence.subforum}` : ""}
            </a>
          </p>
        )}
        <div className="idea-foot">
          <div className="signal-bar" style={{ ["--pct" as string]: `${idea.demandScore}%` }}>
            <span></span>
          </div>
          <a className="btn btn-primary idea-upgrade-cta" href="#pricing">
            Unlock with {idea.tier[0].toUpperCase() + idea.tier.slice(1)}
          </a>
        </div>
      </div>
    </div>
  );
}

function FullIdeaCard({ idea }: { idea: IdeaDrop }) {
  return (
    <div className="idea-card in-view">
      <div className="idea-cover cover-1">
        <span className="tag">{idea.category}</span>
      </div>
      <div className="idea-body">
        <h4>{idea.title}</h4>
        <div className="idea-apis">⌁ {idea.matchedApis.length} API{idea.matchedApis.length === 1 ? "" : "s"} matched</div>
        <div className="idea-foot">
          <span>{idea.evidence.length} signals found</span>
          <div className="signal-bar" style={{ ["--pct" as string]: `${idea.demandScore}%` }}>
            <span></span>
          </div>
        </div>
      </div>
    </div>
  );
}
