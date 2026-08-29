import "server-only";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

/**
 * Session-aware Supabase client for server code that needs to know *who* is
 * signed in (route handlers, server components) — reads/writes the auth
 * cookie set by the browser client during sign-in. Uses the anon key: this
 * client acts as the logged-in user, not as service-role, so it's the right
 * client for "who is this" checks but never for bypassing RLS.
 */
export function getSupabaseAuthServerClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY environment variables.",
    );
  }

  const cookieStore = cookies();

  return createServerClient(url, anonKey, {
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value;
      },
      set(name: string, value: string, options) {
        // Throws when called from a Server Component (cookies are
        // read-only there) — safe to ignore, since middleware or the
        // route handler that issued the session already persisted it.
        try {
          cookieStore.set({ name, value, ...options });
        } catch {
          // no-op, see above
        }
      },
      remove(name: string, options) {
        try {
          cookieStore.set({ name, value: "", ...options });
        } catch {
          // no-op, see above
        }
      },
    },
  });
}
