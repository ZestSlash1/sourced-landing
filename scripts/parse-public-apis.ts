export type ApiEntry = {
  name: string;
  url: string;
  description: string;
  category: string;
  auth: string;
  https: boolean;
  cors: string;
};

const HEADING = /^#{2,3}\s+(.+?)\s*$/;
const SEPARATOR_ROW = /^\|[\s:|-]+\|$/;
const MARKDOWN_LINK = /\[(.+?)\]\((.+?)\)/;

/** Headings in the source README that introduce navigation, not a table of APIs. */
const NON_CATEGORY_HEADINGS = new Set(["index", "contents", "contributing", "license"]);

/** Sentinel standing in for escaped pipes while a row is split on |. */
const PIPE_PLACEHOLDER = "\u0000";

/**
 * Splits a markdown table row into trimmed cells, dropping the empty strings
 * either side of the leading and trailing pipes.
 */
function splitRow(row: string): string[] {
  return row
    .replace(/\\\|/g, PIPE_PLACEHOLDER)
    .split("|")
    .slice(1, -1)
    .map((cell) => cell.replaceAll(PIPE_PLACEHOLDER, "|").trim());
}

/** Strips the backticks the README wraps auth values in (`` `apiKey` `` -> `apiKey`). */
function stripCode(cell: string): string {
  return cell.replace(/`/g, "").trim();
}

/**
 * Parses the public-apis README into a flat list of entries, tagging each row
 * with the category heading its table sits under. Rows outside a category
 * heading, and rows whose first cell is not a markdown link, are skipped.
 */
export function parsePublicApisReadme(markdown: string): ApiEntry[] {
  const entries: ApiEntry[] = [];
  let category: string | null = null;

  for (const line of markdown.split("\n")) {
    const trimmed = line.trim();

    const heading = trimmed.match(HEADING);
    if (heading) {
      const title = heading[1];
      category = NON_CATEGORY_HEADINGS.has(title.toLowerCase()) ? null : title;
      continue;
    }

    // Only the leading pipe is required: some source rows carry a stray token
    // after the closing pipe, and their five leading cells are still valid.
    if (!trimmed.startsWith("|")) continue;
    if (SEPARATOR_ROW.test(trimmed)) continue;
    if (category === null) continue;

    const cells = splitRow(trimmed);
    if (cells.length < 5) continue;

    const [nameCell, description, auth, https, cors] = cells;
    const link = nameCell.match(MARKDOWN_LINK);
    if (!link) continue;

    entries.push({
      name: link[1].trim(),
      url: link[2].trim(),
      description: description,
      category,
      auth: stripCode(auth),
      https: stripCode(https).toLowerCase() === "yes",
      cors: stripCode(cors),
    });
  }

  return entries;
}
