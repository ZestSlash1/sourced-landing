import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth/require-admin";
import { listPendingReviewIdeas } from "@/lib/idea-drops/repository";
import AdminShell from "../admin-shell";
import PendingList from "./pending-list";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Part A4: the human check between an auto-drafted idea and it going live. */
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
      <div className="admin-page-head">
        <h1 className="display admin-page-title">Pending review</h1>
        <p className="mono admin-page-sub">{ideas.length} waiting on you</p>
      </div>

      {ideas.length === 0 ? (
        <div className="admin-card" style={{ padding: "24px 22px" }}>
          <p style={{ color: "var(--ink-soft)", margin: 0, fontSize: 14 }}>Nothing waiting on review.</p>
        </div>
      ) : (
        <PendingList ideas={ideas} />
      )}
    </AdminShell>
  );
}
