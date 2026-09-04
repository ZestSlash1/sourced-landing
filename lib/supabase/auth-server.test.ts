import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const createServerClientMock = vi.fn();
const getAllMock = vi.fn();
const setMock = vi.fn();

vi.mock("next/headers", () => ({
  cookies: () => ({
    getAll: () => getAllMock(),
    set: (...args: unknown[]) => setMock(...args),
  }),
}));

vi.mock("@supabase/ssr", () => ({
  createServerClient: (...args: unknown[]) => createServerClientMock(...args),
}));

import { getSupabaseAuthServerClient } from "./auth-server";

describe("getSupabaseAuthServerClient", () => {
  const origUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const origKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "test-anon-key";
  });

  it("creates server client with getAll and setAll cookie handlers", () => {
    getSupabaseAuthServerClient();

    expect(createServerClientMock).toHaveBeenCalledTimes(1);
    const [url, key, options] = createServerClientMock.mock.calls[0];
    expect(url).toBe("https://example.supabase.co");
    expect(key).toBe("test-anon-key");
    expect(options.cookies.getAll).toBeTypeOf("function");
    expect(options.cookies.setAll).toBeTypeOf("function");

    // Test getAll
    getAllMock.mockReturnValue([{ name: "sb-auth-token", value: "token123" }]);
    expect(options.cookies.getAll()).toEqual([{ name: "sb-auth-token", value: "token123" }]);

    // Test setAll
    options.cookies.setAll([
      { name: "test-cookie", value: "val", options: { path: "/" } },
    ]);
    expect(setMock).toHaveBeenCalledWith("test-cookie", "val", { path: "/" });
  });

  it("handles Server Component cookie read-only error in setAll gracefully", () => {
    getSupabaseAuthServerClient();

    const [, , options] = createServerClientMock.mock.calls[0];
    setMock.mockImplementation(() => {
      throw new Error("Cookies can only be modified in a Server Action or Route Handler.");
    });

    expect(() => {
      options.cookies.setAll([
        { name: "test-cookie", value: "val", options: { path: "/" } },
      ]);
    }).not.toThrow();
  });

  it("throws when environment variables are missing", () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    expect(() => getSupabaseAuthServerClient()).toThrow(
      "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY",
    );
  });
});
