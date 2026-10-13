import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
const { create } = vi.hoisted(() => ({ create: vi.fn() }));
vi.mock("@/lib/auth/require-user", () => ({ requireUser: vi.fn() }));
vi.mock("@/lib/razorpay/client", () => ({ getRazorpayClient: () => ({ subscriptions: { create } }) }));
vi.mock("@/lib/subscriptions/store", () => ({ setSubscriberRazorpaySubscription: vi.fn() }));
vi.mock("@/lib/subscriptions/founding", () => ({ foundingSlotsRemaining: vi.fn() }));
vi.mock("@/lib/track", () => ({ track: vi.fn() }));
import { requireUser } from "@/lib/auth/require-user";
import { setSubscriberRazorpaySubscription } from "@/lib/subscriptions/store";
import { POST } from "./route";
const request = (plan: string) => new Request("https://getsourced.dev/api/razorpay/create-subscription", { method: "POST", body: JSON.stringify({ plan }) });
beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(requireUser).mockResolvedValue({ ok: true, subscriber: { id: "sub", userId: "user", email: "qa@example.com", tier: "free", status: "active" } });
  create.mockResolvedValue({ id: "subscription" });
});
afterEach(() => vi.unstubAllEnvs());
describe("supported checkout plans", () => {
  it("rejects a missing founding plan without creating or linking a subscription", async () => {
    vi.stubEnv("RAZORPAY_PLAN_BUILDER_FOUNDING", "");
    expect((await POST(request("builder-founding"))).status).toBe(503);
    expect(create).not.toHaveBeenCalled();
    expect(setSubscriberRazorpaySubscription).not.toHaveBeenCalled();
  });
  it.each([
    ["builder-monthly", "RAZORPAY_PLAN_BUILDER_MONTHLY"],
    ["studio-monthly", "RAZORPAY_PLAN_STUDIO_MONTHLY"],
  ])("retains the configured %s plan and monthly billing cycles", async (plan, envKey) => {
    vi.stubEnv(envKey, "configured-plan");
    expect((await POST(request(plan))).status).toBe(200);
    expect(create).toHaveBeenCalledWith({ plan_id: "configured-plan", customer_notify: 1, total_count: 120, notes: { subscriberId: "sub" } });
    expect(setSubscriberRazorpaySubscription).toHaveBeenCalledWith("sub", "subscription");
  });
});
