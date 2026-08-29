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
    <main style={{ maxWidth: 560, margin: "0 auto", padding: "40px 24px" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 12,
        }}
      >
        <h1 className="display" style={{ fontSize: 24, margin: 0 }}>
          Pick your topics
        </h1>
        <SignOutButton />
      </div>
      <p style={{ color: "var(--ink-soft)", fontSize: 14, marginBottom: 28 }}>
        Your feed prioritizes these. You can change this any time.
      </p>

      <TopicPickerForm initialTopics={topics} />

      <a
        href="/"
        style={{
          display: "inline-block",
          marginTop: 28,
          fontSize: 13,
          color: "var(--ink-soft)",
          textDecoration: "none",
        }}
      >
        ← Back to Sourced
      </a>
    </main>
  );
}
