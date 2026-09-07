interface RateLimitRecord {
  count: number;
  resetAt: number;
}

export interface RateLimitResult {
  success: boolean;
  remaining: number;
  reset: number;
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
): RateLimitResult {
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

/**
 * Distributed rate limiter with in-memory fallback.
 * Uses Upstash Redis REST pipeline when configured, or seamlessly falls back
 * to local in-memory sliding window when unconfigured or on network errors.
 */
export async function checkRateLimitAsync(
  identifier: string,
  limit = 60,
  windowMs = 60_000
): Promise<RateLimitResult> {
  const upstashUrl = process.env.UPSTASH_REDIS_REST_URL;
  const upstashToken = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (upstashUrl && upstashToken) {
    try {
      const key = `rl:${identifier}`;
      const res = await fetch(`${upstashUrl}/pipeline`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${upstashToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify([
          ["INCR", key],
          ["PEXPIRE", key, windowMs, "NX"],
        ]),
      });

      if (res.ok) {
        const results = (await res.json()) as [{ result: number }, { result: unknown }];
        const currentCount = Number(results[0]?.result ?? 1);
        const resetAt = Date.now() + windowMs;

        if (currentCount > limit) {
          return { success: false, remaining: 0, reset: resetAt };
        }
        return { success: true, remaining: Math.max(0, limit - currentCount), reset: resetAt };
      }
    } catch {
      // Network failure or timeout: gracefully fall back to in-memory
    }
  }

  return checkRateLimit(identifier, limit, windowMs);
}
