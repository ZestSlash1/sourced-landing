// Shared curated-list config for the four keyless/trivially-authed pollers
// added in poller-expansion-spec.md (YouTube, Codeberg, Discourse, Mastodon).
// Kept in one file per that spec, rather than scattered across each poller,
// so targets can be added/removed without touching poller logic. All of
// these are hand-picked and will go stale over time — that's expected for a
// v1 (see the spec's "Notes for the implementer").

/**
 * YouTube channels, addressed by handle (not raw channel id) — the poller
 * resolves each handle to a channel id + uploads-playlist id via
 * `channels.list?forHandle=...` at runtime. Handles are used instead of
 * hardcoded ids because ids can't be hand-verified without hitting the API,
 * while a handle is what's visible on the channel's public page. Skewed
 * toward dev-tool reviews, "build a SaaS" content, and indie-hacker
 * channels — the same audience the other sources target.
 */
export const YOUTUBE_CHANNEL_HANDLES = [
  "@Fireship",
  "@t3dotgg",
  "@ThePrimeagen",
  "@WebDevSimplified",
  "@TraversyMedia",
  "@freecodecamp",
  "@VercelHQ",
  "@Supabase",
  "@KevinPowell",
  "@CodingGarden",
  "@ThePrimeTime",
  "@programmingwithmosh",
  "@syntax",
];

/** Daily YouTube Data API v3 quota budget; see pollYoutubeComments's warning check. */
export const YOUTUBE_DAILY_QUOTA_UNITS = 10_000;
export const YOUTUBE_QUOTA_WARN_THRESHOLD = 8_000;

/**
 * Discourse forum base URLs (no trailing slash) — dev-tool and framework
 * communities that run on Discourse and expose its public `.json` API.
 * Verified as real Discourse installations, not a blind guess list.
 */
export const DISCOURSE_INSTANCES = [
  "https://users.rust-lang.org",
  "https://discuss.python.org",
  "https://forum.freecodecamp.org",
  "https://discuss.streamlit.io",
  "https://community.home-assistant.io",
  "https://discuss.hashicorp.com",
  "https://forum.djangoproject.com",
  "https://discuss.elastic.co",
  "https://community.grafana.com",
  "https://forum.obsidian.md",
  "https://community.n8n.io",
];

/** Politeness delay between requests to the same Discourse instance (ms). */
export const DISCOURSE_REQUEST_DELAY_MS = 1000;

export const DISCOURSE_USER_AGENT = "sourced-ingest-bot/1.0 (+https://sourced.app; devtool signal poller)";

/** Mastodon instances known for a developer/indie-hacker-heavy userbase. */
export const MASTODON_INSTANCES = ["hachyderm.io", "fosstodon.org", "mastodon.social", "indieweb.social"];

/** Hashtags polled per instance via `/api/v1/timelines/tag/{hashtag}`. */
export const MASTODON_HASHTAGS = ["devtools", "buildinpublic", "indiehackers", "webdev", "saas"];

export const MASTODON_REQUEST_DELAY_MS = 1000;

export const MASTODON_USER_AGENT = "sourced-ingest-bot/1.0 (+https://sourced.app; devtool signal poller)";
