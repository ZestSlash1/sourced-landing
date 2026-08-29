import type { Evidence } from "@/types/idea-drop";

export interface EvidenceValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * The hard gate an idea must clear before it can be published: enough
 * evidence, from enough distinct places, recent enough to still be true.
 * Every failing rule is reported at once so a sourcer can fix them in one pass.
 */
export function validateEvidence(evidence: Evidence[]): EvidenceValidationResult {
  const errors: string[] = [];
  const ninetyDaysAgo = new Date();
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

  if (evidence.length < 3) {
    errors.push(`Only ${evidence.length} evidence item(s) — minimum 3 required`);
  }

  const platforms = new Set(evidence.map((e) => e.platform));
  if (platforms.size < 2) {
    errors.push(`Evidence spans only ${platforms.size} platform(s) — minimum 2 required`);
  }

  const hasRecent = evidence.some((e) => new Date(e.date) >= ninetyDaysAgo);
  if (!hasRecent) {
    errors.push("No evidence dated within the last 90 days");
  }

  return { valid: errors.length === 0, errors };
}
