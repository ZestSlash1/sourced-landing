import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("server-only", () => ({}));

import { recordSecurityIncident } from "./alerts";

describe("Security Alerts (recordSecurityIncident)", () => {
  const originalTopic = process.env.NTFY_TOPIC;

  beforeEach(() => {
    process.env.NTFY_TOPIC = "mock-security-topic";
  });

  afterEach(() => {
    process.env.NTFY_TOPIC = originalTopic;
    vi.restoreAllMocks();
  });

  it("formats and dispatches high-priority security notifications", async () => {
    const mockFetch = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal("fetch", mockFetch);

    await recordSecurityIncident({
      type: "admin_unauthorized_access",
      message: "Non-admin attempted to access /admin/pending",
      sourceIp: "192.168.1.100",
      path: "/admin/pending",
      metadata: { userId: "user-attacker-123" },
    });

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [url, options] = mockFetch.mock.calls[0];
    expect(url).toContain("mock-security-topic");
    expect(options.headers.Title).toBe("🚨 Security Alert: admin_unauthorized_access");
    expect(options.headers.Priority).toBe("4");
    expect(options.body).toContain("Non-admin attempted to access /admin/pending");
    expect(options.body).toContain("192.168.1.100");
  });

  it("never throws when notification network call fails", async () => {
    const mockFetch = vi.fn().mockRejectedValue(new Error("Network down"));
    vi.stubGlobal("fetch", mockFetch);

    await expect(
      recordSecurityIncident({
        type: "webhook_signature_forgery",
        message: "Invalid Razorpay HMAC signature",
      })
    ).resolves.not.toThrow();
  });
});
