import Link from "next/link";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth/require-admin";
import { listAllIdeas } from "@/lib/idea-drops/repository";
import SignOutButton from "./sign-out-button";

export const dynamic = "force-dynamic";

const STATUS_COLOR: Record<string, string> = {
  draft: "var(--ink-soft)",
  needs_evidence: "var(--coral)",
  pending_review: "var(--amber, #b8860b)",
  published: "var(--violet)",
};

export default async function AdminDashboard() {
  const check = await requireAdmin();

  if (check.ok === false && check.status === 401) {
    redirect("/admin/login");
  }

  if (check.ok === false) {
    return (
      <main style={{ maxWidth: 480, margin: "80px auto", padding: "0 24px" }}>
        <p>Signed in, but this account isn&apos;t an admin.</p>
        <SignOutButton />
      </main>
    );
  }

  const ideas = await listAllIdeas();

  return (
    <main style={{ maxWidth: 960, margin: "0 auto", padding: "40px 24px" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 28,
        }}
      >
        <h1 className="display" style={{ fontSize: 24, margin: 0 }}>
          Idea drops
        </h1>
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <Link href="/admin/pending" style={{ fontSize: 13 }}>
            Pending review
          </Link>
          <SignOutButton />
        </div>
      </div>

      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
        <thead>
          <tr style={{ textAlign: "left", borderBottom: "1px solid var(--line)" }}>
            <th style={{ padding: "8px 6px" }}>Title</th>
            <th style={{ padding: "8px 6px" }}>Status</th>
            <th style={{ padding: "8px 6px" }}>Tier</th>
            <th style={{ padding: "8px 6px" }}>Demand</th>
            <th style={{ padding: "8px 6px" }} />
          </tr>
        </thead>
        <tbody>
          {ideas.map((idea) => (
            <tr key={idea.id} style={{ borderBottom: "1px solid var(--line)" }}>
              <td style={{ padding: "10px 6px" }}>{idea.title}</td>
              <td style={{ padding: "10px 6px" }}>
                <span style={{ color: STATUS_COLOR[idea.status] ?? "inherit" }}>
                  {idea.status}
                </span>
              </td>
              <td style={{ padding: "10px 6px" }}>{idea.tier}</td>
              <td style={{ padding: "10px 6px" }}>{idea.demandScore}</td>
              <td style={{ padding: "10px 6px", textAlign: "right" }}>
                <Link href={`/admin/ideas/${idea.id}`}>Edit</Link>
              </td>
            </tr>
          ))}
          {ideas.length === 0 && (
            <tr>
              <td colSpan={5} style={{ padding: "20px 6px", color: "var(--ink-soft)" }}>
                No ideas yet.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </main>
  );
}
