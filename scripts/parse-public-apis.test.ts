import { describe, expect, it } from "vitest";
import { parsePublicApisReadme } from "./parse-public-apis";

const README = `
# Public APIs

## Index

* [Animals](#animals)

### Animals

| API | Description | Auth | HTTPS | CORS |
|---|---|---|---|---|
| [Cat Facts](https://catfact.ninja/) | Daily cat facts | No | Yes | No |
| [Dog CEO](https://dog.ceo/dog-api/) | Dog pictures, by breed | \`apiKey\` | No | Unknown |

**[⬆ Back to Index](#index)**

### Finance

| API | Description | Auth | HTTPS | CORS |
|---|---|---|---|---|
| [Alpha Vantage](https://www.alphavantage.co/) | Realtime and historical stock data | \`apiKey\` | Yes | Unknown |
`;

describe("parsePublicApisReadme", () => {
  it("parses every table row under every category heading", () => {
    expect(parsePublicApisReadme(README)).toEqual([
      {
        name: "Cat Facts",
        url: "https://catfact.ninja/",
        description: "Daily cat facts",
        category: "Animals",
        auth: "No",
        https: true,
        cors: "No",
      },
      {
        name: "Dog CEO",
        url: "https://dog.ceo/dog-api/",
        description: "Dog pictures, by breed",
        category: "Animals",
        auth: "apiKey",
        https: false,
        cors: "Unknown",
      },
      {
        name: "Alpha Vantage",
        url: "https://www.alphavantage.co/",
        description: "Realtime and historical stock data",
        category: "Finance",
        auth: "apiKey",
        https: true,
        cors: "Unknown",
      },
    ]);
  });

  it("skips the header and separator rows", () => {
    const entries = parsePublicApisReadme(README);
    expect(entries.map((entry) => entry.name)).not.toContain("API");
    expect(entries.every((entry) => entry.url.startsWith("http"))).toBe(true);
  });

  it("ignores rows whose first cell is not a markdown link", () => {
    const entries = parsePublicApisReadme(`
### Animals

| API | Description | Auth | HTTPS | CORS |
|---|---|---|---|---|
| Cat Facts | No link here | No | Yes | No |
| [Dog CEO](https://dog.ceo/dog-api/) | Dog pictures | No | Yes | No |
`);

    expect(entries).toHaveLength(1);
    expect(entries[0].name).toBe("Dog CEO");
  });

  it("ignores tables that appear before any category heading", () => {
    expect(
      parsePublicApisReadme(`
| API | Description | Auth | HTTPS | CORS |
|---|---|---|---|---|
| [Orphan](https://example.com/) | No heading above it | No | Yes | No |
`),
    ).toEqual([]);
  });

  it("supports both ## and ### category headings", () => {
    const entries = parsePublicApisReadme(`
## Weather

| API | Description | Auth | HTTPS | CORS |
|---|---|---|---|---|
| [Open Meteo](https://open-meteo.com/) | Forecasts | No | Yes | Yes |
`);

    expect(entries[0].category).toBe("Weather");
  });

  it("does not treat the Index heading as a category", () => {
    const entries = parsePublicApisReadme(README);
    expect(entries.map((entry) => entry.category)).not.toContain("Index");
  });

  // The source README has rows like MapQuest's, where a stray token trails the
  // closing pipe. The five leading cells are still good, so the row is kept.
  it("recovers rows with trailing junk after the closing pipe", () => {
    const entries = parsePublicApisReadme(`
### Geocoding

| API | Description | Auth | HTTPS | CORS |
|---|---|---|---|---|
| [MapQuest](https://developer.mapquest.com/) | Map the world | \`apiKey\` | Yes | No | Yes
`);

    expect(entries).toEqual([
      {
        name: "MapQuest",
        url: "https://developer.mapquest.com/",
        description: "Map the world",
        category: "Geocoding",
        auth: "apiKey",
        https: true,
        cors: "No",
      },
    ]);
  });

  // The promo table at the top of the README has only three columns and no
  // auth/HTTPS/CORS data, so those rows are not API entries.
  it("skips tables with fewer than five columns", () => {
    expect(
      parsePublicApisReadme(`
### APILayer APIs

| API | Description | Call this API |
|---|---|---|
| [Fixer](https://fixer.io/) | Currency conversion | [Try it](https://example.com) |
`),
    ).toEqual([]);
  });

  it("keeps descriptions containing escaped pipes intact", () => {
    const entries = parsePublicApisReadme(`
### Animals

| API | Description | Auth | HTTPS | CORS |
|---|---|---|---|---|
| [Cat Facts](https://catfact.ninja/) | Cats \\| dogs | No | Yes | No |
`);

    expect(entries[0].description).toBe("Cats | dogs");
  });
});
