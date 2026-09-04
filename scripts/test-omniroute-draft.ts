import { config } from "dotenv";
config({ path: ".env.local" });

const prompt = `You are drafting a Sourced idea drop from real complaints scraped from developer forums.
Respond with ONLY a single JSON object matching this exact shape, no markdown fences, no commentary:
{
  "title": "Stripe Webhook Dead-Letter Queue & Replayer",
  "category": "Developer Tools",
  "topicTags": ["Dev Tools"],
  "demandScore": 88,
  "tier": "free",
  "problem": { "summary": "Developers lose customer subscriptions due to silent Stripe webhook failures with no easy self-hosted replay tool", "whoFeelsIt": "Full-stack indie hackers and SaaS engineers" },
  "whyNow": "Stripe webhooks are ubiquitous and handling idempotency plus dead letters is painful for solo developers",
  "buildBrief": {
    "coreLoop": ["Receive webhook", "Persist event to Postgres", "Notify developer on failure", "One-click replay to endpoint"],
    "mvpScope": ["Next.js App Router UI", "Supabase DB table for events", "Signature verification middleware", "Replay API route"],
    "explicitlyCut": ["Multi-region failover", "SMS notifications"],
    "dataModel": [{ "name": "WebhookEvent", "fields": "id, event_type, payload, status, last_error, attempts, created_at" }]
  },
  "matchedApiNames": [{ "name": "Stripe", "purpose": "Payment processing and webhook ingestion" }],
  "launchStack": [{ "layer": "database", "tool": "Supabase", "freeTierNote": "Free 500MB database" }],
  "agentPrompts": { "claudeCode": "Build a dead letter replay UI", "cursorWindsurf": "Implement webhook verification", "v0Bolt": "Design clean event table" },
  "difficulty": { "soloWeekendProject": true, "estimatedHours": 14, "skillFloor": "intermediate" }
}`;

import { generateDraft } from "../lib/llm/draft-generator";

async function main() {
  console.log("Calling generateDraft via draft-generator.ts...");
  const result = await generateDraft(prompt);
  console.log("Provider:", result.provider);
  console.log("Model:", result.model);
  console.log("Latency (ms):", result.latencyMs);
  console.log("Tokens:", result.tokens);
  console.log("Fell back:", result.fellBack);
  const parsed = JSON.parse(result.content);
  console.log("Parsed title:", parsed.title);
}

main().catch(console.error);
