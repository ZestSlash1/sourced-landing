import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import type { Subscriber } from "./types";

/**
 * Same caveat as lib/idea-drops/store.ts: no DB is wired up yet (ticket-01's
 * `subscribers` table is spec'd but not built), so this is a JSON-file
 * store for local dev. Replace with the real `subscribers` table from
 * ticket-01-payments.md once it exists — every read/write goes through this
 * module.
 */
const STORE_PATH = path.join(process.cwd(), "data", "subscribers.json");

function readAll(): Subscriber[] {
  if (!existsSync(STORE_PATH)) return [];
  try {
    const raw = JSON.parse(readFileSync(STORE_PATH, "utf8"));
    return Array.isArray(raw) ? raw : [];
  } catch {
    return [];
  }
}

async function writeAll(subscribers: Subscriber[]): Promise<void> {
  await mkdir(path.dirname(STORE_PATH), { recursive: true });
  writeFileSync(STORE_PATH, `${JSON.stringify(subscribers, null, 2)}\n`);
}

export function getSubscriber(email: string): Subscriber | undefined {
  return readAll().find((s) => s.email.toLowerCase() === email.toLowerCase());
}

export async function upsertSubscriber(patch: Subscriber): Promise<Subscriber> {
  const all = readAll();
  const index = all.findIndex((s) => s.email.toLowerCase() === patch.email.toLowerCase());
  if (index === -1) all.push(patch);
  else all[index] = { ...all[index], ...patch };
  await writeAll(all);
  return all[index === -1 ? all.length - 1 : index];
}
