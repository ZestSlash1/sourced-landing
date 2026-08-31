import type { Evidence } from "@/types/idea-drop";

export interface EvidenceValidationResult {
  valid: boolean;
  errors: string[];
}

// Relaxed from 2 to 1 (sourced-pipeline-quality-spec.md Part 4), matching the
// clustering-stage MIN_CLUSTER_PLATFORMS relaxation — see clustering.ts for
// why. Cross-platform spread is still tracked as a stronger-evidence signal
// (Evidence["platform"] diversity), just not gated on here.
export const MIN_EVIDENCE_PLATFORMS = 1;

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
  if (platforms.size < MIN_EVIDENCE_PLATFORMS) {
    errors.push(`Evidence spans only ${platforms.size} platform(s) — minimum ${MIN_EVIDENCE_PLATFORMS} required`);
  }

  const hasRecent = evidence.some((e) => new Date(e.date) >= ninetyDaysAgo);
  if (!hasRecent) {
    errors.push("No evidence dated within the last 90 days");
  }

  return { valid: errors.length === 0, errors };
}
