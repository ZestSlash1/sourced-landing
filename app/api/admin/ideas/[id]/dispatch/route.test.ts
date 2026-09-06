import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "./route";

vi.mock("server-only", () => ({}));

vi.mock("@/lib/auth/require-admin", () => ({
  requireAdmin: vi.fn(),
}));

vi.mock("@/lib/idea-drops/repository", () => ({
  getIdeaById: vi.fn(),
}));

vi.mock("@/lib/email/dispatcher", () => ({
  dispatchWeeklyDrop: vi.fn().mockResolvedValue({
    success: true,
    dryRun: true,
    recipientCount: 15,
    subject: "Test Subject",
  }),
  renderDropEmail: vi.fn().mockReturnValue({
    subject: "Test Subject",
    html: "<p>HTML</p>",
    text: "Plain text",
  }),
}));

import { requireAdmin } from "@/lib/auth/require-admin";
import { getIdeaById } from "@/lib/idea-drops/repository";

describe("POST /api/admin/ideas/[id]/dispatch", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 if user is not an admin", async () => {
    vi.mocked(requireAdmin).mockResolvedValueOnce({ ok: false, status: 401 } as any);

    const req = new Request("http://localhost/api/admin/ideas/123/dispatch", {
      method: "POST",
      body: JSON.stringify({ dryRun: true }),
    });

    const res = await POST(req, { params: { id: "123" } });
    expect(res.status).toBe(401);
  });

  it("returns 404 if idea is not found", async () => {
    vi.mocked(requireAdmin).mockResolvedValueOnce({ ok: true, admin: { email: "admin@test.com" } } as any);
    vi.mocked(getIdeaById).mockResolvedValueOnce(null);

    const req = new Request("http://localhost/api/admin/ideas/123/dispatch", {
      method: "POST",
      body: JSON.stringify({ dryRun: true }),
    });

    const res = await POST(req, { params: { id: "123" } });
    expect(res.status).toBe(404);
  });

  it("returns 400 if idea is not published", async () => {
    vi.mocked(requireAdmin).mockResolvedValueOnce({ ok: true, admin: { email: "admin@test.com" } } as any);
    vi.mocked(getIdeaById).mockResolvedValueOnce({
      id: "123",
      title: "Draft Idea",
      status: "draft",
    } as any);

    const req = new Request("http://localhost/api/admin/ideas/123/dispatch", {
      method: "POST",
      body: JSON.stringify({ dryRun: true }),
    });

    const res = await POST(req, { params: { id: "123" } });
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain("Only published drops");
  });

  it("successfully returns dispatch result for published idea", async () => {
    vi.mocked(requireAdmin).mockResolvedValueOnce({ ok: true, admin: { email: "admin@test.com" } } as any);
    vi.mocked(getIdeaById).mockResolvedValueOnce({
      id: "123",
      title: "Published Idea",
      status: "published",
    } as any);

    const req = new Request("http://localhost/api/admin/ideas/123/dispatch", {
      method: "POST",
      body: JSON.stringify({ dryRun: true }),
    });

    const res = await POST(req, { params: { id: "123" } });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.ok).toBe(true);
    expect(data.recipientCount).toBe(15);
  });
});