import "server-only";

const NTFY_URL = (process.env.NTFY_URL || "https://ntfy.sh").replace(/\/$/, "");

export interface NotifyInput {
  title: string;
  message: string;
  // ntfy emoji shortcodes (e.g. "tada", "moneybag") — safer than putting
  // literal emoji in a header, which ntfy/HTTP headers don't reliably accept.
  tags?: string[];
  priority?: 1 | 2 | 3 | 4 | 5;
}

/**
 * Pushes a phone notification via ntfy.sh (or a self-hosted ntfy server, if
 * NTFY_URL is set) to the private topic in NTFY_TOPIC. A no-op if that env
 * var isn't set. Never throws — same convention as lib/track.ts, since a
 * notification failure must never break the request that triggered it.
 */
export async function notify(input: NotifyInput): Promise<void> {
  const topic = process.env.NTFY_TOPIC;
  if (!topic) return;

  try {
    const res = await fetch(`${NTFY_URL}/${topic}`, {
      method: "POST",
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        Title: input.title,
        ...(input.tags?.length ? { Tags: input.tags.join(",") } : {}),
        ...(input.priority ? { Priority: String(input.priority) } : {}),
      },
      body: input.message,
    });
    if (!res.ok) console.error(`notify(${input.title}): ntfy responded ${res.status}`);
  } catch (err) {
    console.error(`notify(${input.title}): unexpected error`, err);
  }
}
