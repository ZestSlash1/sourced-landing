import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";

const upsertMock = vi.fn();
const getCurrentUserMock = vi.fn();
const trackMock = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  getSupabaseServerClient: () => ({
    from: () => ({
      upsert: (...args: unknown[]) => upsertMock(...args),
    }),
  }),
}));

vi.mock("@/lib/auth/current-user", () => ({
  getCurrentUser: () => getCurrentUserMock(),
}));

vi.mock("@/lib/track", () => ({
  track: (...args: unknown[]) => trackMock(...args),
}));

describe("POST /api/newsletter", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  function makeRequest(body: unknown): Request {
    return new Request("https://localhost/api/newsletter", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: typeof body === "string" ? body : JSON.stringify(body),
    });
  }

  it("rejects invalid or missing email with 400", async () => {
    const resNoEmail = await POST(makeRequest({}));
    expect(resNoEmail.status).toBe(400);
    const jsonNoEmail = await resNoEmail.json();
    expect(jsonNoEmail.error).toBe("Enter a valid email address.");

    const resInvalidEmail = await POST(makeRequest({ email: "not-an-email" }));
    expect(resInvalidEmail.status).toBe(400);
  });

  it("rejects disallowed source path with 400", async () => {
    const res = await POST(makeRequest({ email: "test@example.com", sourcePath: "/invalid-path" }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe("Invalid signup source.");
  });

  it("handles database upsert failure with 500", async () => {
    upsertMock.mockResolvedValue({ error: { message: "DB failure" } });

    const res = await POST(makeRequest({ email: "test@example.com", sourcePath: "/" }));
    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.error).toBe("We couldn't save your email. Please try again.");
  });

  it("successfully saves subscriber, tracks event, and returns ok", async () => {
    upsertMock.mockResolvedValue({ error: null });
    getCurrentUserMock.mockResolvedValue({ id: "user_abc" });

    const res = await POST(makeRequest({ email: "User@Example.com ", sourcePath: "/feed" }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);

    expect(upsertMock).toHaveBeenCalledWith(
      { email: "user@example.com", source_path: "/feed" },
      { onConflict: "email", ignoreDuplicates: true },
    );
    expect(trackMock).toHaveBeenCalledWith({
      eventType: "newsletter_signup",
      userId: "user_abc",
      path: "/feed",
    });
  });
});
