import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/require-user";
import { setSubscriberTopics } from "@/lib/subscriptions/subscriber-topics";
import { track } from "@/lib/track";

/** PUT /api/account/topics — replaces the signed-in subscriber's topic selection (Part B4). */
export async function PUT(request: Request) {
  const check = await requireUser();
  if (check.ok === false) {
    return NextResponse.json({ error: "Unauthorized" }, { status: check.status });
  }

  const body = (await request.json()) as { topics?: unknown };
  if (!Array.isArray(body.topics) || !body.topics.every((t) => typeof t === "string")) {
    return NextResponse.json({ error: "topics must be a string array" }, { status: 400 });
  }

  await setSubscriberTopics(check.subscriber.id, body.topics);
  await track({
    eventType: "topic_updated",
    userId: check.subscriber.userId ?? null,
    metadata: { topics: body.topics },
  });
  return NextResponse.json({ ok: true });
}
