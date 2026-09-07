import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !anonKey || !serviceKey) {
  console.error("Missing SUPABASE credentials in .env.local");
  process.exit(1);
}

const anonClient = createClient(url, anonKey, {
  auth: { persistSession: false },
});

const adminClient = createClient(url, serviceKey, {
  auth: { persistSession: false },
});

const TABLES = [
  "idea_drops",
  "raw_signals",
  "idea_drop_views",
  "sourced_subscribers",
  "subscriber_topics",
  "events",
  "admins",
  "settings",
  "pipeline_runs",
  "sourced_newsletter_signups",
];

// Check potential legacy or cross-tenant table names
const SUSPICIOUS_OR_CROSS_TENANT_TABLES = [
  "subscribers",
  "mettel_users",
  "mettel_projects",
  "mettel_organizations",
  "mettel_settings",
];

async function runAudit() {
  console.log("==================================================");
  console.log("SOURCED SUPABASE RLS AUDIT (RLS-AUDIT-CHECKLIST.md)");
  console.log("Supabase URL:", url);
  console.log("Time:", new Date().toISOString());
  console.log("==================================================\n");

  console.log("--- STEP 3 & 5: Table-by-table probe with ANON key ---");
  const summary: any[] = [];

  for (const table of TABLES) {
    // 1. Check if table exists via Service Role
    const { data: adminData, error: adminError, count: adminCount } = await adminClient
      .from(table)
      .select("*", { count: "exact", head: true });

    const exists = !adminError || adminError.code !== "42P01"; // 42P01 is undefined_table
    if (!exists) {
      summary.push({
        Table: table,
        Exists: "NO",
        "Total Rows (Admin)": 0,
        "Anon SELECT": `Table does not exist (${adminError?.code})`,
        "Anon INSERT": "N/A",
      });
      continue;
    }

    const totalRows = adminCount ?? 0;

    // 2. Anon SELECT probe
    const { data: anonSelectData, error: anonSelectErr, count: anonCount } = await anonClient
      .from(table)
      .select("*", { count: "exact" })
      .limit(5);

    // 3. Anon INSERT probe (with dummy payload)
    const dummyId = "rls-probe-" + Date.now();
    const { error: anonInsertErr } = await anonClient
      .from(table)
      .insert({ id: dummyId } as any);

    const leakedRows = Array.isArray(anonSelectData) ? anonSelectData.length : 0;
    let selectStatus = "SECURE (0 rows / blocked)";
    if (anonSelectErr) {
      selectStatus = `BLOCKED (${anonSelectErr.code})`;
    } else if (leakedRows > 0) {
      selectStatus = `LEAKED (${leakedRows} rows returned!)`;
    } else if (totalRows === 0) {
      selectStatus = "EMPTY TABLE (0 rows in DB)";
    }

    let insertStatus = "BLOCKED";
    if (!anonInsertErr) {
      insertStatus = "ALLOWED / UNRESTRICTED!";
      // cleanup if inserted
      await adminClient.from(table).delete().eq("id", dummyId);
    } else {
      insertStatus = `BLOCKED (${anonInsertErr.code})`;
    }

    summary.push({
      Table: table,
      Exists: "YES",
      "Total Rows (Admin)": totalRows,
      "Anon SELECT": selectStatus,
      "Anon INSERT": insertStatus,
    });
  }

  console.log("\n--- STEP 4: Cross-Tenant Probe with Anon Key ---");
  for (const crossTable of SUSPICIOUS_OR_CROSS_TENANT_TABLES) {
    const { data, error } = await anonClient.from(crossTable).select("*").limit(1);
    if (!error) {
      console.log(`  WARNING: Cross-tenant table '${crossTable}' is ACCESSIBLE to anon key! Rows:`, data?.length);
    } else {
      console.log(`  Cross-tenant table '${crossTable}': ${error.code} - ${error.message}`);
    }
  }

  console.log("\n==================================================");
  console.log("AUDIT SUMMARY");
  console.log("==================================================");
  console.table(summary);
}

runAudit().catch(console.error);
