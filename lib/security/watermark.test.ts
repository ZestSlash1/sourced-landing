import { describe, expect, it } from "vitest";
import { applyWatermark, decodeZeroWidth, encodeZeroWidth, generateLicenseFingerprint } from "./watermark";

describe("Forensic Watermark System", () => {
  it("encodes and decodes strings using invisible zero-width characters", () => {
    const secret = "SRC:sub_1234:fp_abcdef";
    const encoded = encodeZeroWidth(secret);

    // Should only contain zero-width characters
    expect(encoded).toMatch(/^[\u200B\u200C\u200D]+$/);

    // Should decode back to the exact string
    const decoded = decodeZeroWidth(encoded);
    expect(decoded).toBe(secret);
  });

  it("generates deterministic license fingerprint for subscriber and idea", () => {
    const fp1 = generateLicenseFingerprint("sub_user_abc", "sentinelflow-ai");
    const fp2 = generateLicenseFingerprint("sub_user_abc", "sentinelflow-ai");
    const fp3 = generateLicenseFingerprint("sub_user_xyz", "sentinelflow-ai");

    expect(fp1).toBe(fp2);
    expect(fp1).not.toBe(fp3);
    expect(fp1.length).toBe(16);
  });

  it("applies watermark to SQL schema with valid syntax and hidden token", () => {
    const rawSql = "CREATE TABLE test (id uuid primary key);";
    const watermarked = applyWatermark(rawSql, "sub_enterprise_01", "sentinelflow-ai", "sql");

    expect(watermarked).toContain("-- Sourced Verified Export — sentinelflow-ai");
    expect(watermarked).toContain("-- Licensed to Subscriber Ref: [sub_ente]");
    expect(watermarked).toContain(rawSql);

    // Extract hidden token from watermarked content
    const decoded = decodeZeroWidth(watermarked);
    expect(decoded).toContain("SRC:sub_ente:");
  });

  it("applies watermark to Markdown and JavaScript/rules", () => {
    const rawMd = "# Build Brief";
    const watermarkedMd = applyWatermark(rawMd, "sub_1", "idea-drop-1", "markdown");
    expect(watermarkedMd).toContain("<!--");
    expect(watermarkedMd).toContain("Sourced Verified Export — idea-drop-1");

    const rawJs = "const rules = {};";
    const watermarkedJs = applyWatermark(rawJs, "sub_1", "idea-drop-1", "javascript");
    expect(watermarkedJs).toContain("// ============================================================================");
    expect(watermarkedJs).toContain("// Sourced Verified Export — idea-drop-1");
  });
});
