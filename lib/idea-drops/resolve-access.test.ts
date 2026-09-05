import { afterEach, describe, expect, it, vi } from "vitest";
import type { IdeaDrop } from "@/types/idea-drop";
import { previewAccess, resolveAndRecordAccess } from "./resolve-access";

const getQuotaStatus = vi.fn();
const canUnlockIdea = vi.fn();
const recordUnlock = vi.fn();
const hasUnlockedIdea = vi.fn();

vi.mock("./quota", () => ({
  getQuotaStatus: (...args: unknown[]) => getQuotaStatus(...args),
  canUnlockIdea: (...args: unknown[]) => canUnlockIdea(...args),
  recordUnlock: (...args: unknown[]) => recordUnlock(...args),
  hasUnlockedIdea: (...args: unknown[]) => hasUnlockedIdea(...args),
}));
// Not under test here (only previewAccess/resolveAndRecordAccess are) — stubbed only
// because resolve-access.ts imports them for resolveViewerContext.
vi.mock("@/lib/auth/current-user", () => ({ getCurrentUser: vi.fn() }));
vi.mock("@/lib/subscriptions/store", () => ({ getSubscriberByUserId: vi.fn() }));
vi.mock("@/lib/track", () => ({ track: vi.fn() }));

function makeIdea(overrides: Partial<IdeaDrop> = {}): IdeaDrop {
  return {
    id: "idea-1",
    slug: "idea-1",
    title: "Test idea",
    category: "Micro-SaaS",
    demandScore: 80,
    tags: [],
    publishedAt: "2026-08-30",
    tier: "free",
    problem: { summary: "summary", whoFeelsIt: "someone" },
    evidence: [
      { platform: "hackernews", quote: "q1", url: "https://a", date: "2026-08-01" },
      { platform: "reddit", quote: "q2", url: "https://b", date: "2026-08-01" },
      { platform: "g2", quote: "q3", url: "https://c", date: "2026-08-01" },
    ],
    whyNow: "now",
    buildBrief: { coreLoop: [], mvpScope: [], explicitlyCut: [], dataModel: [] },
    matchedApis: [],
    launchStack: [],
    agentPrompts: { claudeCode: "cc", cursorWindsurf: "cw", v0Bolt: "vb" },
    difficulty: { soloWeekendProject: true, estimatedHours: 8, skillFloor: "beginner" },
    status: "published",
    ...overrides,
  };
}

describe("previewAccess", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("returns tier-locked without touching quota when the idea outranks the viewer's tier", async () => {
    const idea = makeIdea({ tier: "studio" });
    const result = await previewAccess(idea, { subscriberId: "sub-1", userId: null, tier: "free" }, new Set());
    expect(result.kind).toBe("tier-locked");
    expect(getQuotaStatus).not.toHaveBeenCalled();
  });

  it("returns full for an anonymous visitor on a free-tier idea", async () => {
    const idea = makeIdea({ tier: "free" });
    const result = await previewAccess(idea, { subscriberId: null, userId: null, tier: "free" }, new Set());
    expect(result.kind).toBe("full");
    expect(getQuotaStatus).not.toHaveBeenCalled();
  });

  it("returns signed-out (as a teaser) for an anonymous visitor on a paid idea", async () => {
    const idea = makeIdea({ tier: "builder" });
    const result = await previewAccess(idea, { subscriberId: null, userId: null, tier: "free" }, new Set());
    expect(result.kind).toBe("signed-out");
    expect("locked" in result.idea && result.idea.locked).toBe(true);
    expect(getQuotaStatus).not.toHaveBeenCalled();
  });

  it("returns full when the idea was already unlocked this or a prior month", async () => {
    const idea = makeIdea({ tier: "free" });
    const result = await previewAccess(idea, { subscriberId: "sub-1", userId: null, tier: "free" }, new Set(["idea-1"]));
    expect(result.kind).toBe("full");
    expect(getQuotaStatus).not.toHaveBeenCalled();
  });

  it("returns full when quota has remaining slots", async () => {
    getQuotaStatus.mockResolvedValue({ quota: 1, used: 0, remaining: 1 });
    const idea = makeIdea({ tier: "free" });
    const result = await previewAccess(idea, { subscriberId: "sub-1", userId: null, tier: "free" }, new Set());
    expect(result.kind).toBe("full");
  });

  it("returns quota-locked (as a teaser) when quota is exhausted and the idea is new", async () => {
    getQuotaStatus.mockResolvedValue({ quota: 1, used: 1, remaining: 0 });
    const idea = makeIdea({ tier: "free" });
    const result = await previewAccess(idea, { subscriberId: "sub-1", userId: null, tier: "free" }, new Set());
    expect(result.kind).toBe("quota-locked");
    expect("locked" in result.idea && result.idea.locked).toBe(true);
    if (result.kind === "quota-locked") {
      expect(result.quota.remaining).toBe(0);
    }
  });

  it("never records an unlock (read-only)", async () => {
    getQuotaStatus.mockResolvedValue({ quota: 1, used: 0, remaining: 1 });
    const idea = makeIdea({ tier: "free" });
    await previewAccess(idea, { subscriberId: "sub-1", userId: null, tier: "free" }, new Set());
    expect(recordUnlock).not.toHaveBeenCalled();
  });
});

describe("resolveAndRecordAccess", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("returns tier-locked without touching quota when the idea outranks the viewer's tier", async () => {
    const idea = makeIdea({ tier: "builder" });
    const result = await resolveAndRecordAccess(idea, { subscriberId: "sub-1", userId: null, tier: "free" });
    expect(result.kind).toBe("tier-locked");
    expect(canUnlockIdea).not.toHaveBeenCalled();
  });

  it("returns full without recording for an anonymous visitor on a free idea", async () => {
    const idea = makeIdea({ tier: "free" });
    const result = await resolveAndRecordAccess(idea, { subscriberId: null, userId: null, tier: "free" });
    expect(result.kind).toBe("full");
    expect(recordUnlock).not.toHaveBeenCalled();
  });

  it("returns signed-out without recording for an anonymous visitor on a paid idea", async () => {
    const idea = makeIdea({ tier: "builder" });
    const result = await resolveAndRecordAccess(idea, { subscriberId: null, userId: null, tier: "free" });
    expect(result.kind).toBe("signed-out");
    expect(recordUnlock).not.toHaveBeenCalled();
  });

  it("records the unlock when the subscriber is allowed", async () => {
    canUnlockIdea.mockResolvedValue({ allowed: true, status: { quota: 1, used: 0, remaining: 1 } });
    const idea = makeIdea({ tier: "free" });
    const result = await resolveAndRecordAccess(idea, { subscriberId: "sub-1", userId: null, tier: "free" });
    expect(result.kind).toBe("full");
    expect(recordUnlock).toHaveBeenCalledWith("sub-1", "idea-1");
  });

  it("returns quota-locked and does not record when over quota", async () => {
    canUnlockIdea.mockResolvedValue({ allowed: false, status: { quota: 1, used: 1, remaining: 0 } });
    const idea = makeIdea({ tier: "free" });
    const result = await resolveAndRecordAccess(idea, { subscriberId: "sub-1", userId: null, tier: "free" });
    expect(result.kind).toBe("quota-locked");
    expect(recordUnlock).not.toHaveBeenCalled();
  });
});
