import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";

const recordSignupMock = vi.fn();
const getCurrentUserMock = vi.fn();
const trackMock = vi.fn();

vi.mock("@/lib/slatebase/server", () => ({
  recordSignup: (...args: unknown[]) => recordSignupMock(...args),
}));

vi.mock("@/lib/auth/current-user", () => ({
  getCurrentUser: () => getCurrentUserMock(),
}));

vi.mock("@/lib/track", () => ({
  track: (...args: unknown[]) => trackMock(...args),
}));

describe("POST /api/signup (Slatebase Integration)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  function makeRequest(body: unknown, headers: Record<string, string> = {}): Request {
    return new Request("https://localhost/api/signup", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-forwarded-for": "192.168.1.50",
        ...headers,
      },
      body: typeof body === "string" ? body : JSON.stringify(body),
    });
  }

  it("rejects invalid or missing email with 400", async () => {
    const resNoEmail = await POST(makeRequest({}));
    expect(resNoEmail.status).toBe(400);
    const jsonNoEmail = (await resNoEmail.json()) as { error: string };
    expect(jsonNoEmail.error).toBe("Please provide a valid email address.");

    const resInvalid = await POST(makeRequest({ email: "invalid-email" }));
    expect(resInvalid.status).toBe(400);
  });

  it("detects bot honeypot field and returns 200 without writing to database", async () => {
    const res = await POST(makeRequest({ email: "bot@spammer.org", hp: "i_am_a_bot" }));
    expect(res.status).toBe(200);
    const json = (await res.json()) as { ok: boolean };
    expect(json.ok).toBe(true);
    expect(recordSignupMock).not.toHaveBeenCalled();
  });

  it("writes valid signup to Slatebase and tracks event", async () => {
    recordSignupMock.mockResolvedValue({ success: true, id: "doc_123" });
    getCurrentUserMock.mockResolvedValue({ id: "usr_456" });

    const res = await POST(
      makeRequest({ email: "founder@startup.io", tier: "free", source: "hero" })
    );

    expect(res.status).toBe(200);
    const json = (await res.json()) as { ok: boolean; existing: boolean; message: string };
    expect(json.ok).toBe(true);
    expect(json.existing).toBe(false);
    expect(recordSignupMock).toHaveBeenCalledWith(
      expect.objectContaining({
        email: "founder@startup.io",
        tier: "free",
        source: "hero",
      })
    );
  });

  it("handles duplicate existing email gracefully without error", async () => {
    recordSignupMock.mockResolvedValue({ success: true, existing: true });

    const res = await POST(makeRequest({ email: "founder@startup.io" }));
    expect(res.status).toBe(200);
    const json = (await res.json()) as { ok: boolean; existing: boolean };
    expect(json.ok).toBe(true);
    expect(json.existing).toBe(true);
  });

  it("returns 500 when Slatebase write fails", async () => {
    recordSignupMock.mockResolvedValue({ success: false, error: "Database unavailable" });

    const res = await POST(makeRequest({ email: "founder@startup.io" }));
    expect(res.status).toBe(500);
    const json = (await res.json()) as { error: string };
    expect(json.error).toBe("Database unavailable");
  });

  it("enforces rate limit when multiple requests exceed threshold", async () => {
    recordSignupMock.mockResolvedValue({ success: true });
    const spamIp = "203.0.113.42";
    let lastRes: Response | null = null;
    for (let i = 0; i < 12; i++) {
      lastRes = await POST(
        makeRequest({ email: `test${i}@domain.com` }, { "x-forwarded-for": spamIp })
      );
    }
    expect(lastRes).not.toBeNull();
    expect(lastRes!.status).toBe(429);
    const json = (await lastRes!.json()) as { error: string };
    expect(json.error).toContain("Too many attempts");
  });
});
