import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const getUserMock = vi.fn();
const maybeSingleMock = vi.fn();

vi.mock("@/lib/supabase/auth-server", () => ({
  getSupabaseAuthServerClient: () => ({
    auth: {
      getUser: () => getUserMock(),
    },
  }),
}));

vi.mock("@/lib/supabase/server", () => ({
  getSupabaseServerClient: () => ({
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: () => maybeSingleMock(),
        }),
      }),
    }),
  }),
}));

import { requireAdmin } from "./require-admin";

describe("requireAdmin", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when no signed-in user", async () => {
    getUserMock.mockResolvedValue({ data: { user: null } });

    const result = await requireAdmin();
    expect(result).toEqual({ ok: false, status: 401 });
  });

  it("returns 403 when user is authenticated but not in admins allowlist", async () => {
    getUserMock.mockResolvedValue({ data: { user: { id: "non-admin-user" } } });
    maybeSingleMock.mockResolvedValue({ data: null, error: null });

    const result = await requireAdmin();
    expect(result).toEqual({ ok: false, status: 403 });
  });

  it("returns ok: true when user is authenticated and in admins allowlist", async () => {
    getUserMock.mockResolvedValue({ data: { user: { id: "admin-user" } } });
    maybeSingleMock.mockResolvedValue({ data: { user_id: "admin-user" }, error: null });

    const result = await requireAdmin();
    expect(result).toEqual({ ok: true });
  });

  it("throws when admins query returns an error", async () => {
    getUserMock.mockResolvedValue({ data: { user: { id: "admin-user" } } });
    maybeSingleMock.mockResolvedValue({ data: null, error: { message: "connection timeout" } });

    await expect(requireAdmin()).rejects.toThrow("requireAdmin: connection timeout");
  });
});
