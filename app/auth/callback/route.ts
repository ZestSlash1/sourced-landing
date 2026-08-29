import { NextResponse } from "next/server";
import { getSupabaseAuthServerClient } from "@/lib/supabase/auth-server";
import { getOrCreateSubscriberForUser } from "@/lib/subscriptions/store";

/**
 * OAuth redirect target (Part B1): Supabase sends the browser here with a
 * `code` after GitHub/Google/Apple sign-in, we exchange it for a session
 * (sets the auth cookie), then bootstrap the subscriber row so the topic
 * picker has something to write to.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const next = url.searchParams.get("next") || "/account/topics";

  if (code) {
    const supabase = getSupabaseAuthServerClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error && data.user?.email) {
      await getOrCreateSubscriberForUser(data.user.id, data.user.email);
    }
  }

  return NextResponse.redirect(new URL(next, url.origin));
}
