import { describe, expect, it, vi } from "vitest";
import type { IdeaDrop } from "@/types/idea-drop";
import { verifyExportAccess } from "@/lib/security/export-gate";

vi.mock("server-only", () => ({}));

vi.mock("@/lib/auth/current-user", () => ({
  getCurrentUser: vi.fn(),
}));

vi.mock("@/lib/subscriptions/store", () => ({
  getSubscriberByUserId: vi.fn(),
}));

vi.mock("@/lib/idea-drops/resolve-user-tier", () => ({
  resolveUserTier: vi.fn(),
}));

vi.mock("@/lib/idea-drops/quota", () => ({
  getQuotaStatus: vi.fn(),
  hasUnlockedIdea: vi.fn(),
  canUnlockIdea: vi.fn(),
  recordUnlock: vi.fn(),
}));

vi.mock("@/lib/track", () => ({
  track: vi.fn(),
}));

const mockIdea: IdeaDrop = {
  id: "sourced-2026-08-29-001",
  slug: "test-idea",
  title: "Test Idea Drop",
  category: "Dev Tools",
  demandScore: 85,
  tags: ["Dev Tools"],
  publishedAt: "2026-08-29T00:00:00.000Z",
  tier: "builder",
  problem: { summary: "Test problem", whoFeelsIt: "Devs" },
  evidence: [],
  whyNow: "Now is good",
  buildBrief: {
    coreLoop: ["step 1"],
    mvpScope: ["mvp"],
    explicitlyCut: ["cut"],
    dataModel: [],
  },
  matchedApis: [],
  launchStack: [],
  agentPrompts: {
    claudeCode: "prompt",
    cursorWindsurf: "prompt",
    v0Bolt: "prompt",
  },
  difficulty: {
    soloWeekendProject: true,
    estimatedHours: 12,
    skillFloor: "beginner",
  },
  status: "published",
};

describe("Export Security Gate", () => {
  it("rejects anonymous callers with 401 Unauthorized", async () => {
    const { getCurrentUser } = await import("@/lib/auth/current-user");
    vi.mocked(getCurrentUser).mockResolvedValueOnce(null);

    const gate = await verifyExportAccess(mockIdea);
    expect(gate.allowed).toBe(false);
    expect(gate.response?.status).toBe(401);
  });

  it("rejects under-tier subscribers with 403 Forbidden", async () => {
    const { getCurrentUser } = await import("@/lib/auth/current-user");
    const { getSubscriberByUserId } = await import("@/lib/subscriptions/store");
    const { resolveUserTier } = await import("@/lib/idea-drops/resolve-user-tier");

    vi.mocked(getCurrentUser).mockResolvedValueOnce({ id: "usr_free", email: "free@example.com" } as any);
    vi.mocked(getSubscriberByUserId).mockResolvedValueOnce({
      id: "sub_free",
      userId: "usr_free",
      tier: "free",
      status: "active",
      email: "free@example.com",
    } as any);
    vi.mocked(resolveUserTier).mockResolvedValueOnce("free");

    const gate = await verifyExportAccess(mockIdea); // mockIdea is 'builder' tier
    expect(gate.allowed).toBe(false);
    expect(gate.response?.status).toBe(403);
  });
});
