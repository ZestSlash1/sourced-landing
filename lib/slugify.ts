/** Lowercase, hyphenated, URL-safe form of a freeform label (category, platform, stack tool, API name). */
export function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
