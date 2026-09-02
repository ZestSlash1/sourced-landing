/**
 * Lightweight HTML-to-text for poller bodies that arrive as HTML rather than
 * markdown/plain text — Mastodon's `content` and Discourse's `cooked` (the
 * anonymous JSON API only returns `cooked`, not the `raw` markdown, which
 * requires auth). A regex pass rather than a dependency: these are short
 * post bodies, not arbitrary documents, so full sanitization isn't warranted.
 */
export function stripHtml(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .trim();
}
