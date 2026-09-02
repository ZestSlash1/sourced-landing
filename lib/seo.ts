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

export interface BreadcrumbItem {
  name: string;
  path: string; // site-relative, e.g. "/category/dev-tools"
}

/** BreadcrumbList JSON-LD for the given trail, Home first — see app/breadcrumbs.tsx for the paired visible nav. */
export function breadcrumbJsonLd(items: BreadcrumbItem[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      item: absoluteUrl(item.path),
    })),
  };
}
