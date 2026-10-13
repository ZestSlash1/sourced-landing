import { beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
vi.mock("@/lib/auth/require-user", () => ({ requireUser: vi.fn() }));
vi.mock("@/lib/idea-drops/repository", () => ({ getPublishedIdeaByIdOrSlug: vi.fn() }));
vi.mock("@/lib/idea-drops/watchlist", () => ({ saveOpportunityWatch: vi.fn(), removeOpportunityWatch: vi.fn() }));
vi.mock("@/lib/track", () => ({ getSessionId: () => "test-session" }));
import { requireUser } from "@/lib/auth/require-user";
import { getPublishedIdeaByIdOrSlug } from "@/lib/idea-drops/repository";
import { saveOpportunityWatch, removeOpportunityWatch } from "@/lib/idea-drops/watchlist";
import { PUT } from "./route";

const request = (body: unknown, origin = "https://getsourced.dev") => new Request("https://getsourced.dev/api/account/watchlist", {
  method: "PUT", headers: { origin, host: "getsourced.dev", "Content-Type": "application/json" }, body: JSON.stringify(body),
});
beforeEach(() => vi.resetAllMocks());
describe("account shortlist API", () => {
  it("rejects cross-site requests before authentication or writes", async () => {
    expect((await PUT(request({ slug: "idea", following: true }, "https://evil.example"))).status).toBe(403);
    expect(requireUser).not.toHaveBeenCalled();
    expect(saveOpportunityWatch).not.toHaveBeenCalled();
  });
  it("requires a signed-in account", async () => {
    vi.mocked(requireUser).mockResolvedValue({ ok: false, status: 401 });
    expect((await PUT(request({ slug: "idea", following: true }))).status).toBe(401);
    expect(getPublishedIdeaByIdOrSlug).not.toHaveBeenCalled();
  });
  const authenticate = () => vi.mocked(requireUser).mockResolvedValue({ ok: true, subscriber: { id: "sub", userId: "actual-user", email: "test@example.com", tier: "free", status: "active" } });
  it("ignores spoofed user IDs and evidence snapshots", async () => {
    authenticate();
    vi.mocked(getPublishedIdeaByIdOrSlug).mockResolvedValue({ id: "published-id", evidence: [] } as any);
    const result = await PUT(request({ slug: "idea", following: true, userId: "victim", evidence: ["spoof"] }));
    expect(result.status).toBe(200);
    expect(saveOpportunityWatch).toHaveBeenCalledWith("actual-user", "published-id", [], "test-session");
  });
  it("rejects malformed payloads and query injection", async () => {
    authenticate();
    for (const body of [null, { slug: "idea", following: "yes" }, { slug: "idea,status.eq.draft", following: true }]) {
      expect((await PUT(request(body))).status).toBe(400);
    }
    const invalid = new Request("https://getsourced.dev/api/account/watchlist", { method: "PUT", body: "{" });
    expect((await PUT(invalid)).status).toBe(400);
    expect(getPublishedIdeaByIdOrSlug).not.toHaveBeenCalled();
  });
  it("cannot save unpublished or missing ideas", async () => {
    authenticate(); vi.mocked(getPublishedIdeaByIdOrSlug).mockResolvedValue(null);
    expect((await PUT(request({ slug: "idea", following: true }))).status).toBe(404);
    expect(saveOpportunityWatch).not.toHaveBeenCalled();
  });
  it("removes only from the signed-in account and reports unavailable storage", async () => {
    authenticate(); vi.mocked(getPublishedIdeaByIdOrSlug).mockResolvedValue({ id: "published-id", evidence: [] } as any);
    expect((await PUT(request({ slug: "idea", following: false }))).status).toBe(200);
    expect(removeOpportunityWatch).toHaveBeenCalledWith("actual-user", "published-id");
    vi.mocked(saveOpportunityWatch).mockRejectedValue(new Error("offline"));
    expect((await PUT(request({ slug: "idea", following: true }))).status).toBe(503);
  });
});
