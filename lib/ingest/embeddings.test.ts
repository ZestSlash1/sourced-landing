import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  cosineSimilarity,
  parseEmbeddingField,
  generateMissingEmbeddings,
  EMBEDDING_DIMENSIONS,
} from "./embeddings";
import type { RawSignal } from "./types";

describe("embeddings", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.restoreAllMocks();
  });

  describe("cosineSimilarity", () => {
    it("returns 1 for identical vectors", () => {
      const vec = [1, 2, 3];
      expect(cosineSimilarity(vec, vec)).toBeCloseTo(1, 5);
    });

    it("returns 0 for orthogonal vectors", () => {
      expect(cosineSimilarity([1, 0], [0, 1])).toBeCloseTo(0, 5);
    });

    it("returns 0 for vectors with different lengths or zero length", () => {
      expect(cosineSimilarity([1, 2], [1, 2, 3])).toBe(0);
      expect(cosineSimilarity([], [])).toBe(0);
    });

    it("returns 0 for all-zero vectors", () => {
      expect(cosineSimilarity([0, 0], [0, 0])).toBe(0);
    });
  });

  describe("parseEmbeddingField", () => {
    it("parses array directly", () => {
      expect(parseEmbeddingField([0.1, 0.2])).toEqual([0.1, 0.2]);
    });

    it("parses JSON array string", () => {
      expect(parseEmbeddingField("[0.1, 0.2]")).toEqual([0.1, 0.2]);
    });

    it("returns null for invalid strings or non-arrays", () => {
      expect(parseEmbeddingField("invalid")).toBeNull();
      expect(parseEmbeddingField('{"a": 1}')).toBeNull();
      expect(parseEmbeddingField(123)).toBeNull();
      expect(parseEmbeddingField(null)).toBeNull();
    });
  });

  describe("generateMissingEmbeddings via Ollama", () => {
    it("generates embeddings using Ollama when OLLAMA_URL is set", async () => {
      process.env.OLLAMA_URL = "http://localhost:11434";
      const fakeEmbeddings = [Array.from({ length: 768 }, () => 0.05)];

      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          model: "nomic-embed-text",
          embeddings: fakeEmbeddings,
          prompt_eval_count: 12,
        }),
      });
      global.fetch = fetchMock;

      const signals: RawSignal[] = [
        {
          id: "sig-1",
          source: "github",
          url: "https://github.com/test/issue/1",
          title: "Build issue",
          text: "Turbopack fails on big repo",
          author: "alice",
          engagementMetric: 5,
          postedAt: "2026-01-01T00:00:00Z",
          fetchedAt: "2026-01-01T01:00:00Z",
          clusterKey: null,
          draftedIdeaId: null,
          embedding: null,
          classifiedAsComplaint: true,
          problemStatement: "Turbopack fails to compile large monorepos",
          domain: "devtools",
          classificationConfidence: 0.95,
        },
      ];

      const { results, stats } = await generateMissingEmbeddings(signals);

      expect(results.length).toBe(1);
      expect(results[0].signalId).toBe("sig-1");
      expect(results[0].embedding.length).toBe(768);
      expect(stats.generated).toBe(1);
      expect(stats.costUsd).toBe(0);
      expect(stats.provider).toBe("ollama");
      expect(fetchMock).toHaveBeenCalledWith(
        "http://localhost:11434/api/embed",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({
            model: "nomic-embed-text",
            input: ["Turbopack fails to compile large monorepos"],
          }),
        }),
      );
    });

    it("skips signals that already have an embedding", async () => {
      const signals: RawSignal[] = [
        {
          id: "sig-1",
          source: "github",
          url: "https://github.com/test/issue/1",
          title: "Build issue",
          text: "Turbopack fails on big repo",
          author: "alice",
          engagementMetric: 5,
          postedAt: "2026-01-01T00:00:00Z",
          fetchedAt: "2026-01-01T01:00:00Z",
          clusterKey: null,
          draftedIdeaId: null,
          embedding: [0.1, 0.2],
          classifiedAsComplaint: true,
          problemStatement: "Turbopack fails",
          domain: "devtools",
          classificationConfidence: 0.95,
        },
      ];

      const { results, stats } = await generateMissingEmbeddings(signals);
      expect(results.length).toBe(0);
      expect(stats.requested).toBe(0);
    });
  });
});
