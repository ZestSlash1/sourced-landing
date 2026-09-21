/** Client-safe list of pollers the admin pipeline banner can trigger. */
export const POLLER_LIST = [
  { id: "hackernews", label: "Hacker News" },
  { id: "stackexchange", label: "StackExchange" },
  { id: "github", label: "GitHub Issues" },
  { id: "devto", label: "Dev.to" },
  { id: "lobsters", label: "Lobsters" },
  { id: "gitlab", label: "GitLab Issues" },
  { id: "youtube", label: "YouTube" },
  { id: "codeberg", label: "Codeberg" },
  { id: "discourse", label: "Discourse" },
  { id: "mastodon", label: "Mastodon" },
  { id: "bluesky", label: "Bluesky" },
  { id: "devrant", label: "DevRant" },
  { id: "appstore", label: "App Store" },
] as const;

export type PollerId = (typeof POLLER_LIST)[number]["id"];
