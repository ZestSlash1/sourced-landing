interface RateLimitRecord {
  count: number;
  resetAt: number;
}

const rateLimitMap = new Map<string, RateLimitRecord>();
const CLEANUP_INTERVAL_MS = 60_000;
let lastCleanup = Date.now();

/**
 * In-memory sliding window rate limiter.
 * Protects public API endpoints from automated harvesting and denial of service.
 */
export function checkRateLimit(
  identifier: string,
  limit = 60,
  windowMs = 60_000
): { success: boolean; remaining: number; reset: number } {
  const now = Date.now();

  if (now - lastCleanup > CLEANUP_INTERVAL_MS) {
    rateLimitMap.forEach((record, key) => {
      if (record.resetAt <= now) {
        rateLimitMap.delete(key);
      }
    });
    lastCleanup = now;
  }

  let record = rateLimitMap.get(identifier);
  if (!record || record.resetAt <= now) {
    record = { count: 1, resetAt: now + windowMs };
    rateLimitMap.set(identifier, record);
    return { success: true, remaining: limit - 1, reset: record.resetAt };
  }

  record.count += 1;
  if (record.count > limit) {
    return { success: false, remaining: 0, reset: record.resetAt };
  }

  return { success: true, remaining: limit - record.count, reset: record.resetAt };
}
