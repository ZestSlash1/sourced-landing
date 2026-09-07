import { createHash, timingSafeEqual } from "crypto";

/**
 * Guards the /api/cron/* routes against unauthorized invocation. Vercel Cron
 * sends requests with `Authorization: Bearer $CRON_SECRET` when CRON_SECRET is
 * configured as a project env var.
 *
 * Employs constant-time equality over SHA-256 digests to eliminate timing
 * side-channel attacks that could leak the secret token.
 */
export function isAuthorizedCronRequest(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;

  const authHeader = request.headers.get("authorization");
  if (!authHeader) return false;

  const expected = `Bearer ${secret}`;

  const expectedHash = createHash("sha256").update(expected).digest();
  const actualHash = createHash("sha256").update(authHeader).digest();

  return timingSafeEqual(expectedHash, actualHash);
}
