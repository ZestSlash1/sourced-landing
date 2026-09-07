import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { isAuthorizedCronRequest } from "./require-cron";

describe("isAuthorizedCronRequest", () => {
  const originalSecret = process.env.CRON_SECRET;

  beforeEach(() => {
    process.env.CRON_SECRET = "super-secret-cron-token-12345";
  });

  afterEach(() => {
    process.env.CRON_SECRET = originalSecret;
  });

  it("returns true when Authorization header matches Bearer token exactly", () => {
    const request = new Request("https://getsourced.dev/api/cron/test", {
      headers: { authorization: "Bearer super-secret-cron-token-12345" },
    });
    expect(isAuthorizedCronRequest(request)).toBe(true);
  });

  it("returns false when Authorization header has wrong token", () => {
    const request = new Request("https://getsourced.dev/api/cron/test", {
      headers: { authorization: "Bearer wrong-token" },
    });
    expect(isAuthorizedCronRequest(request)).toBe(false);
  });

  it("returns false when Authorization header is missing", () => {
    const request = new Request("https://getsourced.dev/api/cron/test");
    expect(isAuthorizedCronRequest(request)).toBe(false);
  });

  it("returns false when CRON_SECRET is not configured", () => {
    delete process.env.CRON_SECRET;
    const request = new Request("https://getsourced.dev/api/cron/test", {
      headers: { authorization: "Bearer super-secret-cron-token-12345" },
    });
    expect(isAuthorizedCronRequest(request)).toBe(false);
  });

  it("returns false for partial prefix attacks or differing lengths", () => {
    const request = new Request("https://getsourced.dev/api/cron/test", {
      headers: { authorization: "Bearer super-secret-cron" },
    });
    expect(isAuthorizedCronRequest(request)).toBe(false);
  });
});
