import { config } from "dotenv";
config({ path: ".env.local" });
import { createClient } from "@supabase/supabase-js";

async function main() {
  const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });
  const { data, error } = await sb.from("raw_signals").select("id, source, title, cluster_key").not("cluster_key", "is", null);
  if (error) throw error;
  const byKey = new Map<string, { source: string; title: string | null }[]>();
  for (const r of (data ?? []) as { source: string; title: string | null; cluster_key: string }[]) {
    const arr = byKey.get(r.cluster_key) ?? [];
    arr.push({ source: r.source, title: r.title });
    byKey.set(r.cluster_key, arr);
  }
  for (const [key, sigs] of Array.from(byKey.entries()).sort((a, b) => b[1].length - a[1].length)) {
    const platforms = Array.from(new Set(sigs.map((s) => s.source)));
    console.log(`\ncluster ${key.slice(0, 8)}  size=${sigs.length}  platforms=[${platforms.join(",")}]`);
    for (const s of sigs.slice(0, 5)) console.log(`  [${s.source}] ${(s.title ?? "").slice(0, 90)}`);
    if (sigs.length > 5) console.log(`  … +${sigs.length - 5} more`);
  }
}
main().catch((e) => { console.error(e); process.exit(1); });
