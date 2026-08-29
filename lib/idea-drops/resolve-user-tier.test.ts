import { afterEach, describe, expect, it, vi } from "vitest";
import { resolveUserTier } from "./resolve-user-tier";

const getCurrentUser = vi.fn();
const getSubscriberByUserId = vi.fn();

vi.mock("@/lib/auth/current-user", () => ({
  getCurrentUser: (...args: unknown[]) => getCurrentUser(...args),
}));
vi.mock("@/lib/subscriptions/store", () => ({
  getSubscriberByUserId: (...args: unknown[]) => getSubscriberByUserId(...args),
}));

describe("resolveUserTier", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("returns free for a logged-out visitor", async () => {
    getCurrentUser.mockResolvedValue(null);
    expect(await resolveUserTier()).toBe("free");
    expect(getSubscriberByUserId).not.toHaveBeenCalled();
  });

  it("returns the subscriber's tier for an active, signed-in user", async () => {
    getCurrentUser.mockResolvedValue({ id: "user-1", email: "a@b.com" });
    getSubscriberByUserId.mockResolvedValue({
      id: "sub-1",
      email: "a@b.com",
      tier: "studio",
      status: "active",
    });
    expect(await resolveUserTier()).toBe("studio");
  });

  it("falls back to free when the subscriber isn't active (past_due/cancelled)", async () => {
    getCurrentUser.mockResolvedValue({ id: "user-1", email: "a@b.com" });
    getSubscriberByUserId.mockResolvedValue({
      id: "sub-1",
      email: "a@b.com",
      tier: "builder",
      status: "cancelled",
    });
    expect(await resolveUserTier()).toBe("free");
  });

  it("falls back to free when signed in but no subscriber row exists yet", async () => {
    getCurrentUser.mockResolvedValue({ id: "user-1", email: "a@b.com" });
    getSubscriberByUserId.mockResolvedValue(null);
    expect(await resolveUserTier()).toBe("free");
  });
});
