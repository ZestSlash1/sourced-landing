import Link from "next/link";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth/require-admin";
import { listAllIdeas } from "@/lib/idea-drops/repository";
import AdminShell from "./admin-shell";

export const dynamic = "force-dynamic";

const STATUS_STYLE: Record<string, { fg: string; bg: string }> = {
  draft: { fg: "var(--ink-soft)", bg: "var(--bg)" },
  needs_evidence: { fg: "#C4432F", bg: "rgba(255,111,94,0.14)" },
  pending_review: { fg: "#8A5A00", bg: "rgba(255,184,77,0.18)" },
  published: { fg: "var(--violet-deep)", bg: "rgba(91,79,247,0.12)" },
};

export default async function AdminDashboard() {
  const check = await requireAdmin();

  if (check.ok === false && check.status === 401) {
    redirect("/admin/login");
  }

  if (check.ok === false) {
    return (
      <AdminShell active="/admin">
        <p>Signed in, but this account isn&apos;t an admin.</p>
      </AdminShell>
    );
  }

  const ideas = await listAllIdeas();

  return (
    <AdminShell active="/admin">
      <div style={{ marginBottom: 24 }}>
        <h1 className="display" style={{ fontSize: 28, margin: "0 0 6px", letterSpacing: "-0.015em" }}>
          Idea drops
        </h1>
        <p className="mono" style={{ fontSize: 12.5, color: "var(--ink-soft)", margin: 0 }}>
          {ideas.length} idea{ideas.length === 1 ? "" : "s"} total
        </p>
      </div>

      <div
        style={{
          background: "var(--surface)",
          border: "1px solid var(--line)",
          borderRadius: "var(--r-xl)",
          boxShadow: "var(--shadow)",
          overflow: "hidden",
        }}
      >
        {ideas.length === 0 ? (
          <p style={{ padding: "24px 22px", color: "var(--ink-soft)", margin: 0, fontSize: 14 }}>No ideas yet.</p>
        ) : (
          ideas.map((idea, i) => {
            const status = STATUS_STYLE[idea.status] ?? STATUS_STYLE.draft;
            return (
              <Link
                key={idea.id}
                href={`/admin/ideas/${idea.id}`}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 16,
                  padding: "16px 22px",
                  borderTop: i === 0 ? "none" : "1px solid var(--line)",
                  textDecoration: "none",
                  color: "inherit",
                }}
              >
                <div style={{ minWidth: 0 }}>
                  <div
                    style={{
                      fontWeight: 600,
                      fontSize: 14.5,
                      marginBottom: 5,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {idea.title}
                  </div>
                  <div style={{ fontSize: 12.5, color: "var(--ink-soft)" }}>
                    {idea.category} · demand {idea.demandScore} · {idea.tier} tier
                  </div>
                </div>

                <span
                  style={{
                    flexShrink: 0,
                    fontSize: 11.5,
                    fontWeight: 600,
                    padding: "5px 11px",
                    borderRadius: "var(--r-chip)",
                    color: status.fg,
                    background: status.bg,
                    whiteSpace: "nowrap",
                  }}
                >
                  {idea.status.replace("_", " ")}
                </span>
              </Link>
            );
          })
        )}
      </div>
    </AdminShell>
  );
}
