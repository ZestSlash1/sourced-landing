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
  // Added per ingest-expansion-v2-spec.md Part 1. Verified live via
  // GET {instance}/latest.json returning 200 with topic data on 2026-09-04.
  // Dropped from the spec's candidate list: community.cloudflare.com (403,
  // bot-blocked), community.databricks.com (404, not actually Discourse),
  // forum.figma.com (404, not actually Discourse), community.render.com
  // (301s to render.discourse.group, which doesn't resolve — dead redirect).
  "https://community.openai.com",
  "https://forum.cockroachlabs.com",
  "https://forum.asana.com",
  // Verified live on 2026-09-06:
  "https://community.retool.com",
  "https://forum.bubble.io",
  "https://community.auth0.com",
  "https://discourse.getdbt.com",
  "https://forum.ghost.org",
  "https://forums.docker.com",
  "https://discourse.gohugo.io",
  "https://discourse.nixos.org",
  "https://discourse.julialang.org",
  "https://discuss.kotlinlang.org",
  "https://discuss.pytorch.org",
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

/**
 * Bluesky (AT Protocol) search queries (ingest-expansion-v2-spec.md Part 2)
 * — the same HN pain-phrase list plus hashtags Bluesky's dev/indie-maker
 * community actively uses.
 */
export const BLUESKY_SEARCH_QUERIES = [
  "wish there was",
  "wish there were",
  "does anyone know a tool",
  "does anyone know of a tool",
  "i hate that",
  "is there a tool",
  "looking for a tool",
  "i wish someone would build",
  "#buildinpublic",
  "#indiehackers",
  "#saas",
];

export interface AppStoreTarget {
  id: string;
  name: string;
  country?: string;
}

/**
 * Curated list of B2B, developer, and freelance SaaS products with active mobile apps.
 * Used by pollAppStoreReviews to fetch keyless customer review RSS feeds.
 */
export const APPLE_APP_STORE_TARGETS: AppStoreTarget[] = [
  { id: "584606479", name: "Intuit QuickBooks for Business" },
  { id: "471713959", name: "Expensify" },
  { id: "371294472", name: "Shopify" },
  { id: "1232780281", name: "Notion" },
  { id: "978516833", name: "Stripe Dashboard" },
  { id: "489969512", name: "Asana" },
  { id: "1645587184", name: "Linear Mobile" },
  { id: "461504587", name: "Trello" },
  { id: "1052884030", name: "FreshBooks Invoicing App" },
  { id: "914172636", name: "Airtable" },
  { id: "618783545", name: "Slack" },
  { id: "1107711722", name: "HubSpot" },
];

export const APP_STORE_REQUEST_DELAY_MS = 500;
export const APP_STORE_MAX_RATING = 2; // only 1★ and 2★ negative reviews
export const APP_STORE_USER_AGENT = "sourced-ingest-bot/1.0 (+https://sourced.app; devtool signal poller)";
