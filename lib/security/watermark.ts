import crypto from "crypto";

const ZW_ZERO = "\u200B"; // Zero-width space represents bit 0
const ZW_ONE = "\u200C";  // Zero-width non-joiner represents bit 1
const ZW_DELIM = "\u200D"; // Zero-width joiner represents start/end boundary

/**
 * Encodes an ASCII string into an invisible zero-width character sequence.
 */
export function encodeZeroWidth(text: string): string {
  let binary = "";
  for (let i = 0; i < text.length; i++) {
    const bin = text.charCodeAt(i).toString(2).padStart(8, "0");
    binary += bin;
  }

  let zwStr = ZW_DELIM;
  for (let i = 0; i < binary.length; i++) {
    zwStr += binary[i] === "1" ? ZW_ONE : ZW_ZERO;
  }
  zwStr += ZW_DELIM;
  return zwStr;
}

/**
 * Decodes an invisible zero-width character sequence back into an ASCII string.
 */
export function decodeZeroWidth(text: string): string | null {
  const start = text.indexOf(ZW_DELIM);
  if (start === -1) return null;
  const end = text.indexOf(ZW_DELIM, start + 1);
  if (end === -1) return null;

  const zwSub = text.slice(start + 1, end);
  let binary = "";
  for (let i = 0; i < zwSub.length; i++) {
    const ch = zwSub[i];
    if (ch === ZW_ONE) binary += "1";
    else if (ch === ZW_ZERO) binary += "0";
  }

  if (binary.length % 8 !== 0) return null;

  let result = "";
  for (let i = 0; i < binary.length; i += 8) {
    const byte = binary.slice(i, i + 8);
    result += String.fromCharCode(parseInt(byte, 2));
  }
  return result;
}

/**
 * Generates a cryptographic verification signature for this export.
 */
export function generateLicenseFingerprint(subscriberId: string, ideaSlug: string): string {
  const salt = process.env.SUPABASE_SERVICE_ROLE_KEY || "sourced-watermark-salt-key";
  return crypto
    .createHmac("sha256", salt)
    .update(`${subscriberId}:${ideaSlug}`)
    .digest("hex")
    .slice(0, 16);
}

export type WatermarkFormat = "sql" | "markdown" | "javascript";

/**
 * Injects both an overt legal license header and an invisible forensic steganographic
 * watermark into exported files. If a user distributes this brief on GitHub/Reddit,
 * the zero-width watermark survives copy-paste and identifies the exact source account.
 */
export function applyWatermark(
  content: string,
  subscriberId: string,
  ideaSlug: string,
  format: WatermarkFormat
): string {
  const fingerprint = generateLicenseFingerprint(subscriberId, ideaSlug);
  const accountRef = subscriberId.slice(0, 8);
  const hiddenToken = `SRC:${accountRef}:${fingerprint}`;
  const invisibleWatermark = encodeZeroWidth(hiddenToken);

  const timestamp = new Date().toISOString();
  const noticeLines = [
    `Sourced Verified Export — ${ideaSlug}`,
    `Licensed to Subscriber Ref: [${accountRef}] · Fingerprint: ${fingerprint}`,
    `Generated at: ${timestamp} · https://www.getsourced.dev`,
    "Notice: Proprietary build brief. Automated scraping, public resale, or redistribution is strictly prohibited.",
  ];

  if (format === "sql") {
    const header = [
      "-- ============================================================================",
      ...noticeLines.map((line) => `-- ${line}`),
      "-- ============================================================================",
      `-- ${invisibleWatermark}`,
      "",
    ].join("\n");
    return header + content;
  }

  if (format === "markdown") {
    const header = [
      "<!--",
      "============================================================================",
      ...noticeLines,
      "============================================================================",
      invisibleWatermark,
      "-->",
      "",
    ].join("\n");
    return header + content;
  }

  // format === "javascript" or config files (.cursorrules)
  const header = [
    "// ============================================================================",
    ...noticeLines.map((line) => `// ${line}`),
    "// ============================================================================",
    `// ${invisibleWatermark}`,
    "",
  ].join("\n");
  return header + content;
}
