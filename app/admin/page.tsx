import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth/require-admin";
import { listAllIdeas } from "@/lib/idea-drops/repository";
import AdminShell from "./admin-shell";
import IdeasList from "./ideas-list";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

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
      <div className="admin-page-head">
        <h1 className="display admin-page-title">Idea drops</h1>
        <p className="mono admin-page-sub">
          {ideas.length} idea{ideas.length === 1 ? "" : "s"} total
        </p>
      </div>

      <div className="admin-card" style={{ overflow: "hidden" }}>
        <IdeasList ideas={ideas} />
      </div>
    </AdminShell>
  );
}
