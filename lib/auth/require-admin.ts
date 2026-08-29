import "server-only";
import { getSupabaseAuthServerClient } from "@/lib/supabase/auth-server";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export type AdminCheck = { ok: true } | { ok: false; status: 401 | 403 };

/**
 * Guard for admin-only route handlers. Call at the top of any admin route
 * once one exists (idea authoring, ingest trigger, evidence review) — this
 * replaces the old ADMIN_API_TOKEN bearer-token check, which never actually
 * shipped in this repo, so there's nothing else to remove.
 *
 * 401 = no signed-in Supabase session. 403 = signed in, but not in `admins`.
 */
export async function requireAdmin(): Promise<AdminCheck> {
  const authClient = getSupabaseAuthServerClient();
  const {
    data: { user },
  } = await authClient.auth.getUser();

  if (!user) return { ok: false, status: 401 };

  // admins has RLS enabled with no policies, so even an authenticated
  // non-admin session can't read it directly — the service-role client is
  // required here, same as every other write/privileged read in this app.
  const service = getSupabaseServerClient();
  const { data: admin, error } = await service
    .from("admins")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) throw new Error(`requireAdmin: ${error.message}`);
  if (!admin) return { ok: false, status: 403 };

  return { ok: true };
}
