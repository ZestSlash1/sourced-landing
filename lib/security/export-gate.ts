import { NextResponse } from "next/server";
import type { IdeaDrop } from "@/types/idea-drop";
import { resolveAndRecordAccess, resolveViewerContext } from "@/lib/idea-drops/resolve-access";

export type ExportGateResult =
  | { allowed: true; subscriberId: string; response?: never }
  | { allowed: false; response: NextResponse; subscriberId?: never };

/**
 * Validates whether the caller has entitlement to download the full build brief,
 * SQL schema, or AI agent prompts. Returns 401/403 responses if the caller is
 * anonymous, under-tier, or out of quota.
 */
export async function verifyExportAccess(idea: IdeaDrop): Promise<ExportGateResult> {
  const viewer = await resolveViewerContext();
  const access = await resolveAndRecordAccess(idea, viewer);

  if (access.kind === "signed-out") {
    return {
      allowed: false,
      response: new NextResponse(
        "Authentication required: Please sign in or create an account at https://www.getsourced.dev/login to download this build brief.",
        {
          status: 401,
          headers: {
            "Content-Type": "text/plain; charset=utf-8",
            "WWW-Authenticate": "Bearer realm='getsourced.dev'",
          },
        }
      ),
    };
  }

  if (access.kind === "tier-locked") {
    return {
      allowed: false,
      response: new NextResponse(
        `Access restricted: This build brief requires the ${idea.tier.toUpperCase()} tier. Upgrade your account at https://www.getsourced.dev/#pricing`,
        {
          status: 403,
          headers: { "Content-Type": "text/plain; charset=utf-8" },
        }
      ),
    };
  }

  if (access.kind === "quota-locked") {
    return {
      allowed: false,
      response: new NextResponse(
        "Quota exhausted: You have reached your monthly unlock quota for full build briefs. Upgrade at https://www.getsourced.dev/#pricing or wait until the next calendar month.",
        {
          status: 403,
          headers: { "Content-Type": "text/plain; charset=utf-8" },
        }
      ),
    };
  }

  return {
    allowed: true,
    subscriberId: viewer.subscriberId ?? "subscriber",
  };
}
