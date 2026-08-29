/**
 * Guards the /api/cron/* routes. Vercel Cron sends requests with
 * `Authorization: Bearer $CRON_SECRET` when CRON_SECRET is set as a project
 * env var (https://vercel.com/docs/cron-jobs/manage-cron-jobs#securing-cron-jobs) —
 * this rejects anything else so the ingest/draft endpoints can't be hit by
 * a stranger to burn through the Reddit/GitHub/Claude API quota.
 */
export function isAuthorizedCronRequest(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  return request.headers.get("authorization") === `Bearer ${secret}`;
}
