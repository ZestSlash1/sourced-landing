import { beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
vi.mock("@/lib/idea-drops/repository", () => ({ getPublishedIdeaByIdOrSlug: vi.fn() }));
vi.mock("@/lib/idea-drops/resolve-access", () => ({ previewAccess: vi.fn(), resolveViewerContext: vi.fn() }));
vi.mock("@/lib/idea-drops/quota", () => ({ unlockedIdeaIds: vi.fn() }));
import { getPublishedIdeaByIdOrSlug } from "@/lib/idea-drops/repository";
import { previewAccess, resolveViewerContext } from "@/lib/idea-drops/resolve-access";
import { unlockedIdeaIds } from "@/lib/idea-drops/quota";
import { GET } from "./route";

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(getPublishedIdeaByIdOrSlug).mockResolvedValue({ id: "idea", slug: "test" } as any);
  vi.mocked(unlockedIdeaIds).mockResolvedValue(new Set());
});
const get = () => GET(new Request("https://getsourced.dev/api/ideas/test/database"), { params: { id: "test" } });
describe("database availability", () => {
  it("never returns invented credentials to an eligible viewer", async () => {
    vi.mocked(resolveViewerContext).mockResolvedValue({ userId: "user", subscriberId: "sub", tier: "studio" });
    vi.mocked(previewAccess).mockResolvedValue({ kind: "full", idea: {} as any });
    const response = await get();
    expect(response.status).toBe(503);
    const body = await response.text();
    expect(body).toContain("not available");
    expect(body).not.toMatch(/postgresql:\/\/|dev_key_live|connectionString/);
  });
  it("preserves authentication and tier boundaries", async () => {
    vi.mocked(resolveViewerContext).mockResolvedValue({ userId: null, subscriberId: null, tier: "free" });
    expect((await get()).status).toBe(401);
    expect(previewAccess).not.toHaveBeenCalled();
    vi.mocked(resolveViewerContext).mockResolvedValue({ userId: "user", subscriberId: "sub", tier: "free" });
    vi.mocked(previewAccess).mockResolvedValue({ kind: "tier-locked", idea: {} as any });
    expect((await get()).status).toBe(403);
  });
});
