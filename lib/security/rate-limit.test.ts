import { describe, expect, it } from "vitest";
import { checkRateLimit } from "./rate-limit";

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
});
