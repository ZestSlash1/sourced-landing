import { afterEach, describe, expect, it, vi } from "vitest";
vi.mock("@/lib/subscriptions/founding", () => ({ FOUNDING_SLOTS: 100, foundingSlotsRemaining: vi.fn() }));
import { foundingSlotsRemaining } from "@/lib/subscriptions/founding";
import { GET } from "./route";
afterEach(() => { vi.unstubAllEnvs(); vi.clearAllMocks(); });
describe("founding offer availability", () => {
  it("does not advertise an unconfigured checkout even with unclaimed slots", async () => {
    vi.stubEnv("RAZORPAY_PLAN_BUILDER_FOUNDING", "");
    expect(await (await GET()).json()).toEqual({ remaining: null, total: 100, available: false });
    expect(foundingSlotsRemaining).not.toHaveBeenCalled();
  });
  it("retains the real slot count when a plan is configured", async () => {
    vi.stubEnv("RAZORPAY_PLAN_BUILDER_FOUNDING", "plan_configured");
    vi.mocked(foundingSlotsRemaining).mockResolvedValue(7);
    expect(await (await GET()).json()).toEqual({ remaining: 7, total: 100, available: true });
  });
});
