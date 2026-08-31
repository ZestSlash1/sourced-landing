import Link from "next/link";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth/require-admin";
import { listPendingReviewIdeas } from "@/lib/idea-drops/repository";
import AdminShell from "../admin-shell";
import CompetitiveLandscapePanel from "./competitive-landscape-panel";
import ReviewActions from "./review-actions";

export const dynamic = "force-dynamic";

/** Part A4 — the human check between an auto-drafted idea and it going live. */
export default async function PendingReviewPage() {
  const check = await requireAdmin();
  if (check.ok === false && check.status === 401) redirect("/admin/login");
  if (check.ok === false) {
    return (
      <AdminShell active="/admin/pending">
        <p>Signed in, but this account isn&apos;t an admin.</p>
      </AdminShell>
    );
  }

  const ideas = await listPendingReviewIdeas();

  return (
    <AdminShell active="/admin/pending">
      <div style={{ marginBottom: 24 }}>
        <h1 className="display" style={{ fontSize: 28, margin: "0 0 6px", letterSpacing: "-0.015em" }}>
          Pending review
        </h1>
        <p className="mono" style={{ fontSize: 12.5, color: "var(--ink-soft)", margin: 0 }}>
          {ideas.length} waiting on you
        </p>
      </div>

      {ideas.length === 0 && (
        <div
          style={{
            background: "var(--surface)",
            border: "1px solid var(--line)",
            borderRadius: "var(--r-xl)",
            padding: "24px 22px",
            boxShadow: "var(--shadow)",
          }}
        >
          <p style={{ color: "var(--ink-soft)", margin: 0, fontSize: 14 }}>Nothing waiting on review.</p>
        </div>
      )}

      {ideas.map((idea) => {
        const platformCount = idea.platformCount ?? new Set(idea.evidence.map((e) => e.platform)).size;
        const crossPlatform = idea.crossPlatform ?? platformCount >= 2;
        return (
        <div
          key={idea.id}
          style={{
            background: "var(--surface)",
            border: "1px solid var(--line)",
            borderRadius: "var(--r-xl)",
            boxShadow: "var(--shadow)",
            padding: 22,
            marginBottom: 16,
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <h2 style={{ margin: "0 0 4px", fontSize: 17 }}>{idea.title}</h2>
              <p style={{ margin: "0 0 12px", fontSize: 13, color: "var(--ink-soft)" }}>
                {idea.category} · demand {idea.demandScore} · {idea.tier} tier · tags: {idea.tags.join(", ")}
              </p>
              <span
                className="mono"
                style={{
                  display: "inline-block",
                  fontSize: 11,
                  fontWeight: 700,
                  padding: "3px 9px",
                  borderRadius: "var(--r-chip)",
                  marginBottom: 12,
                  color: crossPlatform ? "var(--violet-deep)" : "var(--ink-soft)",
                  background: crossPlatform ? "rgba(91,79,247,0.09)" : "rgba(0,0,0,0.05)",
                }}
              >
                {crossPlatform ? `${platformCount}+ sources` : "1 source"}
              </span>
            </div>
            <Link
              href={`/admin/ideas/${idea.id}`}
              style={{
                flexShrink: 0,
                fontSize: 12.5,
                fontWeight: 600,
                padding: "6px 14px",
                borderRadius: "var(--r-chip)",
                border: "1px solid var(--line)",
                color: "var(--ink)",
                textDecoration: "none",
              }}
            >
              Edit
            </Link>
          </div>

          <p style={{ fontSize: 14, margin: "0 0 12px" }}>{idea.problem.summary}</p>

          <div style={{ marginBottom: 16 }}>
            <p style={{ fontSize: 12, color: "var(--ink-soft)", margin: "0 0 6px" }}>
              Evidence ({idea.evidence.length} source{idea.evidence.length === 1 ? "" : "s"}):
            </p>
            <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13 }}>
              {idea.evidence.map((e) => (
                <li key={e.url} style={{ marginBottom: 4 }}>
                  <a href={e.url} target="_blank" rel="noreferrer">
                    {e.platform}
                  </a>
                  {" — "}
                  {e.quote.slice(0, 120)}
                  {e.quote.length > 120 ? "..." : ""}
                </li>
              ))}
            </ul>
          </div>

          <CompetitiveLandscapePanel ideaId={idea.id} landscape={idea.competitiveLandscape} />

          <ReviewActions
            ideaId={idea.id}
            hasCloseCompetitor={idea.competitiveLandscape?.verdict === "close_competitor_exists"}
          />
        </div>
        );
      })}
    </AdminShell>
  );
}
