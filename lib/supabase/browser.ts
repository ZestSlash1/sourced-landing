"use client";
import { createBrowserClient } from "@supabase/ssr";

/**
 * Browser-side Supabase client for admin auth (sign-in, session refresh).
 * Uses the anon key only — safe to ship to the client, unlike the
 * service-role client in lib/supabase/server.ts.
 */
export function getSupabaseBrowserClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY environment variables.",
    );
  }

  return createBrowserClient(url, anonKey);
}
