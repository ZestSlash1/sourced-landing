import type { Evidence } from "@/types/idea-drop";

/** URL-level deduplication only; different URLs do not establish independent buyers. */
export function evidenceSummary(evidence: Evidence[]) {
  const urls = new Set(evidence.map((item) => canonicalEvidenceUrl(item.url)));
  const dates = evidence.map((item) => item.date).filter((date) => Number.isFinite(Date.parse(date))).sort();
  return { entries: evidence.length, uniqueUrls: urls.size, repeatedUrls: evidence.length - urls.size,
    earliest: dates[0] ?? null, latest: dates.at(-1) ?? null };
}

export function canonicalEvidenceUrl(value: string): string {
  try {
    const url = new URL(value);
    url.hostname = url.hostname.toLowerCase().replace(/^www\./, "");
    url.pathname = url.pathname.replace(/\/+$/, "");
    for (const key of Array.from(url.searchParams.keys())) {
      if (key.startsWith("utm_") || key === "fbclid") url.searchParams.delete(key);
    }
    url.searchParams.sort();
    // Fragments can identify individual reviews, so preserve them.
    return url.toString();
  } catch { return value.trim(); }
}
