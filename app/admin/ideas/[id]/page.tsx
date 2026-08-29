import { notFound, redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth/require-admin";
import { getIdeaById } from "@/lib/idea-drops/repository";
import IdeaEditForm from "./idea-edit-form";

export const dynamic = "force-dynamic";

export default async function EditIdeaPage({ params }: { params: { id: string } }) {
  const check = await requireAdmin();

  if (check.ok === false && check.status === 401) {
    redirect("/admin/login");
  }
  if (check.ok === false) {
    return (
      <main style={{ maxWidth: 480, margin: "80px auto", padding: "0 24px" }}>
        <p>Signed in, but this account isn&apos;t an admin.</p>
      </main>
    );
  }

  const idea = await getIdeaById(params.id);
  if (!idea) notFound();

  return (
    <main style={{ maxWidth: 720, margin: "0 auto", padding: "40px 24px" }}>
      <IdeaEditForm idea={idea} />
    </main>
  );
}
