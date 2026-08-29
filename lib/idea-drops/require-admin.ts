/**
 * No user/role/auth system exists in this repo yet — there's no "admin
 * role" to check against. Per sourced-idea-drop-spec.md Task 2 ("flag this
 * to the user rather than inventing one"), this is a stopgap: a single
 * shared bearer token from an env var, checked on every admin route. This
 * should be replaced with real admin auth (tied to a user record) once one
 * exists.
 */
export function isAuthorizedAdmin(request: Request): boolean {
  const token = process.env.ADMIN_API_TOKEN;
  if (!token) return false;
  const header = request.headers.get("authorization") ?? "";
  return header === `Bearer ${token}`;
}
