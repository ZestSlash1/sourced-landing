import "server-only";

/**
 * The apex domain is reserved for an unrelated Supabase tunnel — every
 * canonical/OG/sitemap URL must use the www host, never the apex.
 */
export const SITE_URL = "https://www.getsourced.dev";

export function absoluteUrl(path: string): string {
  return new URL(path, SITE_URL).toString();
}

export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength - 1).trimEnd()}…`;
}
