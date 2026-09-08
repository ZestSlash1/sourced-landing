import { config } from "dotenv";
config({ path: ".env.local" });

// Bypass "server-only" for standalone tsx execution
const serverOnlyPath = require.resolve("server-only");
require.cache[serverOnlyPath] = {
  id: serverOnlyPath,
  filename: serverOnlyPath,
  loaded: true,
  exports: {},
} as any;

async function main() {
  const { runDraftPass } = await import("../lib/ingest/run-draft-pass");
  console.log("Triggering runDraftPass()...");
  const result = await runDraftPass();
  console.log("\nDraft pass completed successfully!");
  console.log(JSON.stringify(result, null, 2));
}

main().catch((err) => {
  console.error("Draft pass failed:", err);
  process.exit(1);
});
