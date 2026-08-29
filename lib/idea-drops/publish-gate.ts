import type { IdeaDrop } from "@/types/idea-drop";
import { validateEvidence } from "./validate-evidence";

/**
 * Enforces the evidence gate on every create/update, regardless of the status
 * the caller asked for. Call this in the write path (DB write or API route) so
 * a direct API call carrying `status: "published"` cannot bypass it — a
 * client-side form check is not sufficient.
 *
 * Returns a new idea; never mutates the input.
 */
export function applyEvidenceGate(
  idea: IdeaDrop,
  requestedStatus: IdeaDrop["status"],
): IdeaDrop {
  const { valid, errors } = validateEvidence(idea.evidence);

  if (!valid) {
    return { ...idea, status: "needs_evidence", validationErrors: errors };
  }

  // Drop the key entirely rather than leaving `validationErrors: undefined`,
  // so a repaired idea serializes clean.
  const { validationErrors: _cleared, ...rest } = idea;
  return { ...rest, status: requestedStatus };
}

/**
 * Whether an idea may be returned by the public list/detail routes. Draft and
 * needs_evidence ideas are invisible to every tier, including paid ones.
 */
export function isPubliclyVisible(idea: IdeaDrop): boolean {
  return idea.status === "published";
}
