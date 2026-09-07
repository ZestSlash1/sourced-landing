import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { checkRateLimit, checkRateLimitAsync } from "./rate-limit";

describe("Rate Limiter", () => {
  it("allows requests under the specified limit", () => {
    const id = "test-ip-1";
    const r1 = checkRateLimit(id, 5, 1000);
    expect(r1.success).toBe(true);
    expect(r1.remaining).toBe(4);

    const r2 = checkRateLimit(id, 5, 1000);
    expect(r2.success).toBe(true);
    expect(r2.remaining).toBe(3);
  });

  it("blocks requests exceeding the limit", () => {
    const id = "test-ip-blocked";
    for (let i = 0; i < 3; i++) {
      expect(checkRateLimit(id, 3, 5000).success).toBe(true);
    }

    const blocked = checkRateLimit(id, 3, 5000);
    expect(blocked.success).toBe(false);
    expect(blocked.remaining).toBe(0);
  });

  describe("checkRateLimitAsync with distributed fallback", () => {
    const originalUrl = process.env.UPSTASH_REDIS_REST_URL;
    const originalToken = process.env.UPSTASH_REDIS_REST_TOKEN;

    afterEach(() => {
      process.env.UPSTASH_REDIS_REST_URL = originalUrl;
      process.env.UPSTASH_REDIS_REST_TOKEN = originalToken;
      vi.restoreAllMocks();
    });

    it("falls back to in-memory limiter when Upstash env vars are absent", async () => {
      delete process.env.UPSTASH_REDIS_REST_URL;
      delete process.env.UPSTASH_REDIS_REST_TOKEN;

      const res = await checkRateLimitAsync("async-test-fallback", 10, 60_000);
      expect(res.success).toBe(true);
      expect(res.remaining).toBe(9);
    });

    it("uses Upstash REST API when configured", async () => {
      process.env.UPSTASH_REDIS_REST_URL = "https://mock-redis.upstash.io";
      process.env.UPSTASH_REDIS_REST_TOKEN = "mock-token";

      const mockFetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => [{ result: 1 }, { result: 1 }],
      });
      vi.stubGlobal("fetch", mockFetch);

      const res = await checkRateLimitAsync("async-upstash-test", 5, 60_000);
      expect(res.success).toBe(true);
      expect(res.remaining).toBe(4);
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it("gracefully falls back to in-memory if Upstash fetch fails", async () => {
      process.env.UPSTASH_REDIS_REST_URL = "https://mock-redis.upstash.io";
      process.env.UPSTASH_REDIS_REST_TOKEN = "mock-token";

      const mockFetch = vi.fn().mockRejectedValueOnce(new Error("Network timeout"));
      vi.stubGlobal("fetch", mockFetch);

      const res = await checkRateLimitAsync("async-upstash-failover", 5, 60_000);
      expect(res.success).toBe(true);
      expect(res.remaining).toBe(4);
    });
  });
});
