import { notFound, redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth/require-admin";
import { getIdeaById } from "@/lib/idea-drops/repository";
import AdminShell from "../../admin-shell";
import IdeaEditForm from "./idea-edit-form";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export default async function EditIdeaPage({ params }: { params: { id: string } }) {
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

  const idea = await getIdeaById(params.id);
  if (!idea) notFound();

  return (
    <AdminShell active="/admin">
      <IdeaEditForm idea={idea} />
    </AdminShell>
  );
}
