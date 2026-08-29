import Link from "next/link";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/require-user";
import { getSubscriberTopics } from "@/lib/subscriptions/subscriber-topics";
import SignOutButton from "../sign-out-button";
import TopicPickerForm from "./topic-picker-form";

export const dynamic = "force-dynamic";

export default async function TopicsPage() {
  const check = await requireUser();
  if (check.ok === false) {
    redirect("/login");
  }

  const topics = await getSubscriberTopics(check.subscriber.id);

  return (
    <main className="app-shell narrow">
      <div className="app-header">
        <h1 className="app-title display">Pick your topics</h1>
        <SignOutButton />
      </div>
      <p className="app-sub">Your feed prioritizes these. You can change this any time.</p>

      <TopicPickerForm initialTopics={topics} />

      <div style={{ marginTop: 28 }}>
        <Link href="/account" className="back-link">
          ← Back to Account
        </Link>
      </div>
    </main>
  );
}
