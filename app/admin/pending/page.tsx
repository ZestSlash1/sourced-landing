import Link from "next/link";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth/require-admin";
import { listPendingReviewIdeas } from "@/lib/idea-drops/repository";
import ReviewActions from "./review-actions";

export const dynamic = "force-dynamic";

/** Part A4 — the human check between an auto-drafted idea and it going live. */
export default async function PendingReviewPage() {
  const check = await requireAdmin();
  if (check.ok === false && check.status === 401) redirect("/admin/login");
  if (check.ok === false) {
    return (
      <main style={{ maxWidth: 480, margin: "80px auto", padding: "0 24px" }}>
        <p>Signed in, but this account isn&apos;t an admin.</p>
      </main>
    );
  }

  const ideas = await listPendingReviewIdeas();

  return (
    <main style={{ maxWidth: 800, margin: "0 auto", padding: "40px 24px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 24 }}>
        <h1 className="display" style={{ fontSize: 24, margin: 0 }}>
          Pending review
        </h1>
        <Link href="/admin" style={{ fontSize: 13, color: "var(--ink-soft)" }}>
          Back to all ideas
        </Link>
      </div>

      {ideas.length === 0 && (
        <p style={{ color: "var(--ink-soft)" }}>Nothing waiting on review.</p>
      )}

      {ideas.map((idea) => (
        <div
          key={idea.id}
          style={{
            border: "1px solid var(--line)",
            borderRadius: "var(--r-lg)",
            padding: 20,
            marginBottom: 16,
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <h2 style={{ margin: "0 0 4px", fontSize: 17 }}>{idea.title}</h2>
              <p style={{ margin: "0 0 12px", fontSize: 13, color: "var(--ink-soft)" }}>
                {idea.category} · demand {idea.demandScore} · {idea.tier} tier · tags: {idea.tags.join(", ")}
              </p>
            </div>
            <Link href={`/admin/ideas/${idea.id}`} style={{ fontSize: 13 }}>
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

          <ReviewActions ideaId={idea.id} />
        </div>
      ))}
    </main>
  );
}
