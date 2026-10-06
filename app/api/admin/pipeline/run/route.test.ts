import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("server-only", () => ({}));

vi.mock("@/lib/auth/require-admin", () => ({
  requireAdmin: vi.fn(),
}));

vi.mock("@/lib/ingest/poller-registry", () => ({
  isPollerId: (v: unknown) => v === "hackernews",
  runPoller: vi.fn().mockResolvedValue({ fetched: 3, noiseFiltered: 1, inserted: 2 }),
}));

vi.mock("@/lib/ingest/run-draft-pass", () => ({
  runDraftPass: vi.fn().mockResolvedValue({ drafted: 1, clustersPassingBar: 2, errors: [] }),
}));

vi.mock("@/lib/ingest/pipeline-jobs-repository", async () => {
  const actual = await vi.importActual<typeof import("@/lib/ingest/pipeline-jobs-repository")>(
    "@/lib/ingest/pipeline-jobs-repository",
  );
  return {
    canRunDraftInline: actual.canRunDraftInline,
    enqueueDraftJob: vi.fn().mockResolvedValue({ id: "job-1", status: "queued" }),
    getPipelineJob: vi.fn(),
    getLatestDraftJob: vi.fn(),
  };
});

import { GET, POST } from "./route";
import { requireAdmin } from "@/lib/auth/require-admin";
import { runDraftPass } from "@/lib/ingest/run-draft-pass";
import { enqueueDraftJob, getLatestDraftJob, getPipelineJob } from "@/lib/ingest/pipeline-jobs-repository";

function post(body: unknown): Request {
  return new Request("http://localhost/api/admin/pipeline/run", { method: "POST", body: JSON.stringify(body) });
}

describe("/api/admin/pipeline/run", () => {
  const originalOllamaUrl = process.env.OLLAMA_URL;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requireAdmin).mockResolvedValue({ ok: true });
  });

  afterEach(() => {
    if (originalOllamaUrl === undefined) delete process.env.OLLAMA_URL;
    else process.env.OLLAMA_URL = originalOllamaUrl;
  });

  it("rejects non-admins", async () => {
    vi.mocked(requireAdmin).mockResolvedValueOnce({ ok: false, status: 403 });
    const res = await POST(post({ stage: "draft" }));
    expect(res.status).toBe(403);
    expect(enqueueDraftJob).not.toHaveBeenCalled();
  });

  it("runs a poll stage inline", async () => {
    const res = await POST(post({ stage: "poll", source: "hackernews" }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ fetched: 3, noiseFiltered: 1, inserted: 2 });
  });

  it("queues the draft stage for the falcon worker when Ollama is unreachable (Vercel)", async () => {
    delete process.env.OLLAMA_URL;
    const res = await POST(post({ stage: "draft" }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ queued: true, job: { id: "job-1", status: "queued" } });
    expect(enqueueDraftJob).toHaveBeenCalledWith("admin");
    expect(runDraftPass).not.toHaveBeenCalled();
  });

  it("runs the draft stage inline where Ollama is configured (falcon)", async () => {
    process.env.OLLAMA_URL = "http://localhost:11434";
    const res = await POST(post({ stage: "draft" }));
    expect(await res.json()).toEqual({ drafted: 1, clustersPassingBar: 2, errors: [] });
    expect(runDraftPass).toHaveBeenCalledOnce();
    expect(enqueueDraftJob).not.toHaveBeenCalled();
  });

  it("surfaces enqueue failures as 502 with the message", async () => {
    delete process.env.OLLAMA_URL;
    vi.mocked(enqueueDraftJob).mockRejectedValueOnce(new Error("enqueueDraftJob: relation does not exist"));
    const res = await POST(post({ stage: "draft" }));
    expect(res.status).toBe(502);
    expect(await res.json()).toEqual({ error: "enqueueDraftJob: relation does not exist" });
  });

  it("GET returns a job by id, 404s unknown ids, and 400s without a job param", async () => {
    vi.mocked(getPipelineJob).mockResolvedValueOnce({ id: "job-1", status: "running" } as never);
    const found = await GET(new Request("http://localhost/api/admin/pipeline/run?job=job-1"));
    expect(await found.json()).toEqual({ job: { id: "job-1", status: "running" } });

    vi.mocked(getPipelineJob).mockResolvedValueOnce(null);
    const missing = await GET(new Request("http://localhost/api/admin/pipeline/run?job=nope"));
    expect(missing.status).toBe(404);

    const noParam = await GET(new Request("http://localhost/api/admin/pipeline/run"));
    expect(noParam.status).toBe(400);
  });

  it("GET ?job=latest returns null rather than 404 when no job has ever run", async () => {
    vi.mocked(getLatestDraftJob).mockResolvedValueOnce(null);
    const res = await GET(new Request("http://localhost/api/admin/pipeline/run?job=latest"));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ job: null });
  });
});
