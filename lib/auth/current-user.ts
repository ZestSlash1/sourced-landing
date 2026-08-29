import "server-only";
import { getSupabaseAuthServerClient } from "@/lib/supabase/auth-server";

export interface CurrentUser {
  id: string;
  email: string | null;
}

/** The signed-in Supabase Auth user for this request, or null if logged out. */
export async function getCurrentUser(): Promise<CurrentUser | null> {
  const authClient = getSupabaseAuthServerClient();
  const {
    data: { user },
  } = await authClient.auth.getUser();

  if (!user) return null;
  return { id: user.id, email: user.email ?? null };
}
