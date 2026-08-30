import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/current-user";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { track } from "@/lib/track";

export const dynamic = "force-dynamic";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ALLOWED_SOURCE_PATHS = new Set(["/", "/feed", "/methodology"]);

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { email?: unknown; sourcePath?: unknown } | null;
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  const sourcePath = typeof body?.sourcePath === "string" ? body.sourcePath : "/";

  if (!EMAIL_PATTERN.test(email)) {
    return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
  }
  if (!ALLOWED_SOURCE_PATHS.has(sourcePath)) {
    return NextResponse.json({ error: "Invalid signup source." }, { status: 400 });
  }

  const supabase = getSupabaseServerClient();
  const { error } = await supabase
    .from("sourced_newsletter_signups")
    .upsert({ email, source_path: sourcePath }, { onConflict: "email", ignoreDuplicates: true });

  if (error) {
    console.error(`newsletter signup: ${error.message}`);
    return NextResponse.json({ error: "We couldn't save your email. Please try again." }, { status: 500 });
  }

  const user = await getCurrentUser();
  await track({ eventType: "newsletter_signup", userId: user?.id ?? null, path: sourcePath });
  return NextResponse.json({ ok: true });
}
