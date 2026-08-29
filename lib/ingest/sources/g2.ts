import type { RawComplaint } from "../types";

/**
 * G2 has no public API. Scraping their review pages would violate G2's
 * Terms of Service, so this is deliberately NOT built — this connector is a
 * manual/CSV-import path instead, per sourced-phase2-spec.md Task 1.1
 * ("ask the user whether they want scraping — flag the ToS risk rather than
 * building it silently").
 *
 * Expected CSV columns: product, reviewText, url, date, rating
 */
export function parseG2Csv(csv: string, product: string): RawComplaint[] {
  const [header, ...rows] = csv.trim().split("\n");
  const columns = header.split(",").map((c) => c.trim());
  const col = (name: string) => columns.indexOf(name);

  return rows
    .filter((row) => row.trim().length > 0)
    .map((row): RawComplaint => {
      const cells = row.split(",");
      return {
        platform: "g2",
        subforum: product,
        rawText: cells[col("reviewText")]?.trim() ?? "",
        url: cells[col("url")]?.trim() ?? "",
        date: cells[col("date")]?.trim() ?? new Date().toISOString(),
        engagementRaw: cells[col("rating")]
          ? { type: "review_rating", value: Number(cells[col("rating")]) }
          : undefined,
      };
    });
}
