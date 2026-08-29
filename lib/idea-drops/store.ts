import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import type { IdeaDrop } from "@/types/idea-drop";
import { validateEvidence } from "./validate-evidence";

/**
 * No database is wired up yet (ticket-01-payments.md's `DATABASE_URL` /
 * Supabase table is still "ticket 03", not built). This is a JSON-file store
 * — same pattern as data/public-apis.json — so the rest of the app has a
 * real read/write seam to develop against. Writes work in local dev; on
 * Vercel's read-only serverless filesystem they will NOT persist across
 * invocations. Swap this module's internals for a real DB client once one
 * exists; every call site here goes through this file so that's a
 * single-file change.
 */
const STORE_PATH = path.join(process.cwd(), "data", "idea-drops.json");

function readAll(): IdeaDrop[] {
  if (!existsSync(STORE_PATH)) return [];
  try {
    const raw = JSON.parse(readFileSync(STORE_PATH, "utf8"));
    return Array.isArray(raw) ? raw : [];
  } catch {
    return [];
  }
}

async function writeAll(ideas: IdeaDrop[]): Promise<void> {
  await mkdir(path.dirname(STORE_PATH), { recursive: true });
  writeFileSync(STORE_PATH, `${JSON.stringify(ideas, null, 2)}\n`);
}

export function listPublished(): IdeaDrop[] {
  return readAll().filter((idea) => idea.status === "published");
}

export function listAllForAdmin(): IdeaDrop[] {
  return readAll();
}

export function getByIdOrSlug(idOrSlug: string): IdeaDrop | undefined {
  return readAll().find((idea) => idea.id === idOrSlug || idea.slug === idOrSlug);
}

export function getPublishedByIdOrSlug(idOrSlug: string): IdeaDrop | undefined {
  const idea = getByIdOrSlug(idOrSlug);
  return idea && idea.status === "published" ? idea : undefined;
}

/**
 * Applies the Task 3 publish gate server-side: evidence is validated on
 * every create/update, and `status` can never land on "published" while
 * validation fails — regardless of what the caller requested.
 */
function applyEvidenceGate(idea: IdeaDrop): IdeaDrop {
  const result = validateEvidence(idea.evidence);
  if (!result.valid) {
    return { ...idea, status: "needs_evidence", validationErrors: result.errors };
  }
  const { validationErrors: _drop, ...clean } = idea;
  return clean;
}

export async function upsertIdea(idea: IdeaDrop): Promise<IdeaDrop> {
  const gated = applyEvidenceGate(idea);
  const all = readAll();
  const index = all.findIndex((existing) => existing.id === gated.id);
  if (index === -1) all.push(gated);
  else all[index] = gated;
  await writeAll(all);
  return gated;
}

export async function patchIdea(
  id: string,
  patch: Partial<IdeaDrop>
): Promise<IdeaDrop | undefined> {
  const all = readAll();
  const index = all.findIndex((existing) => existing.id === id);
  if (index === -1) return undefined;
  const merged: IdeaDrop = { ...all[index], ...patch, id: all[index].id };
  const gated = applyEvidenceGate(merged);
  all[index] = gated;
  await writeAll(all);
  return gated;
}
