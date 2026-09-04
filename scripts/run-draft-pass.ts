import { config } from "dotenv";
config({ path: ".env.local" });
import { runDraftPass } from "../lib/ingest/run-draft-pass";

async function main() {
  console.log("Triggering runDraftPass()...");
  const result = await runDraftPass();
  console.log("\nDraft pass completed successfully!");
  console.log(JSON.stringify(result, null, 2));
}

main().catch((err) => {
  console.error("Draft pass failed:", err);
  process.exit(1);
});
