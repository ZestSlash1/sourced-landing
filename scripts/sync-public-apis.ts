import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { parsePublicApisReadme, type ApiEntry } from "./parse-public-apis";

const README_URL =
  "https://raw.githubusercontent.com/public-apis/public-apis/master/README.md";

const OUTPUT_PATH = path.join(process.cwd(), "data", "public-apis.json");

/**
 * If a run parses fewer than this fraction of the previous run's entries, we
 * assume the README's structure changed and the parser needs updating, rather
 * than the directory genuinely shrinking. The existing file is kept.
 */
const MIN_ENTRY_RATIO = 0.5;

type Snapshot = {
  syncedAt: string;
  source: string;
  count: number;
  entries: ApiEntry[];
};

function readPreviousCount(): number | null {
  if (!existsSync(OUTPUT_PATH)) return null;

  try {
    const previous = JSON.parse(readFileSync(OUTPUT_PATH, "utf8")) as Snapshot;
    return Array.isArray(previous.entries) ? previous.entries.length : null;
  } catch {
    // An unreadable previous file is not a reason to abort a good run.
    return null;
  }
}

async function fetchReadme(): Promise<string> {
  const response = await fetch(README_URL);
  if (!response.ok) {
    throw new Error(`Fetch failed: ${response.status} ${response.statusText}`);
  }
  return response.text();
}

export async function syncPublicApis(): Promise<Snapshot> {
  const previousCount = readPreviousCount();

  const markdown = await fetchReadme();
  const entries = parsePublicApisReadme(markdown);

  if (entries.length === 0) {
    throw new Error("Parsed 0 entries — the README structure has likely changed.");
  }

  if (previousCount !== null && entries.length < previousCount * MIN_ENTRY_RATIO) {
    throw new Error(
      `Parsed ${entries.length} entries, down from ${previousCount} — more than ` +
        `${(1 - MIN_ENTRY_RATIO) * 100}% drop, treating as a parse failure.`,
    );
  }

  const snapshot: Snapshot = {
    syncedAt: new Date().toISOString(),
    source: README_URL,
    count: entries.length,
    entries,
  };

  await mkdir(path.dirname(OUTPUT_PATH), { recursive: true });
  writeFileSync(OUTPUT_PATH, `${JSON.stringify(snapshot, null, 2)}\n`);

  return snapshot;
}

async function main() {
  try {
    const snapshot = await syncPublicApis();
    const categories = new Set(snapshot.entries.map((entry) => entry.category));
    console.log(
      `Wrote ${snapshot.count} entries across ${categories.size} categories to ${OUTPUT_PATH}`,
    );
  } catch (error) {
    console.error(
      `public-apis sync failed, keeping the existing ${OUTPUT_PATH}:`,
      error instanceof Error ? error.message : error,
    );
    process.exitCode = 1;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  void main();
}
