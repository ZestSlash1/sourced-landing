import "server-only";
import type { IdeaDrop } from "@/types/idea-drop";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { notify } from "@/lib/notify";
import { track } from "@/lib/track";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://www.getsourced.dev";

export interface EmailPayload {
  subject: string;
  html: string;
  text: string;
}

export interface DispatchOptions {
  dryRun?: boolean;
  testRecipients?: string[];
}

export interface DispatchResult {
  success: boolean;
  dryRun: boolean;
  recipientCount: number;
  subject: string;
  error?: string;
  messageId?: string;
}

/**
 * Normalizes, trims, lowercases, and deduplicates an array of email address lists.
 */
export function deduplicateRecipients(...lists: (string[] | undefined | null)[]): string[] {
  const unique = new Set<string>();

  for (const list of lists) {
    if (!list) continue;
    for (const raw of list) {
      if (typeof raw !== "string") continue;
      const email = raw.trim().toLowerCase();
      if (EMAIL_PATTERN.test(email)) {
        unique.add(email);
      }
    }
  }

  return Array.from(unique);
}

/**
 * Renders the weekly idea drop into a high-converting, responsive HTML and plain text email.
 */
export function renderDropEmail(idea: IdeaDrop): EmailPayload {
  const dropUrl = `${APP_URL}/feed/${idea.slug}?utm_source=weekly_drop&utm_medium=email`;
  const subject = `[Sourced Drop] ${idea.title} (${idea.demandScore}% Demand Signal)`;

  const apisList = idea.matchedApis?.length
    ? idea.matchedApis.slice(0, 3).map((api) => `- ${api.name} (${api.purpose}) -- ${api.freeTierLimit}`).join("\n")
    : "- Standard REST/GraphQL APIs";

  const text = `
SOURCED - WEEKLY BUILD BRIEF
${"=".repeat(40)}

${idea.title}
Category: ${idea.category} | Demand Score: ${idea.demandScore}% | Tier: ${idea.tier}

THE PROBLEM:
${idea.problem.summary}

TARGET BUYER:
${idea.problem.whoFeelsIt}

WHY NOW:
${idea.whyNow}

MATCHED APIS:
${apisList}

VIEW FULL BRIEF & AGENT PROMPTS:
${dropUrl}

You are receiving this because you are subscribed to Sourced drops.
Manage your preferences or unsubscribe: ${APP_URL}/account
`.trim();

  const apisHtml = idea.matchedApis?.length
    ? idea.matchedApis
        .slice(0, 3)
        .map(
          (api) =>
            `<li style="margin-bottom: 6px;"><strong>${api.name}</strong> <span style="color: #71717a; font-size: 13px;">(${api.purpose})</span> -- <span style="font-size: 13px; color: #27272a;">${api.freeTierLimit}</span></li>`
        )
        .join("")
    : `<li>Standard REST/GraphQL APIs</li>`;

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #09090b; color: #f4f4f5; margin: 0; padding: 24px 16px;">
  <div style="max-width: 600px; margin: 0 auto; background-color: #18181b; border: 1px solid #27272a; border-radius: 12px; overflow: hidden;">
    <!-- Header -->
    <div style="padding: 24px 28px; border-bottom: 1px solid #27272a; display: flex; align-items: center; justify-content: space-between;">
      <span style="font-family: monospace; font-weight: 700; font-size: 16px; letter-spacing: 0.05em; color: #a78bfa;">SOURCED // WEEKLY DROP</span>
      <span style="font-family: monospace; font-size: 12px; background: rgba(167, 139, 250, 0.15); color: #c4b5fd; padding: 3px 8px; border-radius: 999px;">${idea.category}</span>
    </div>

    <!-- Body Content -->
    <div style="padding: 32px 28px;">
      <div style="margin-bottom: 8px;">
        <span style="display: inline-block; font-family: monospace; font-size: 12px; color: #34d399; font-weight: 600; margin-bottom: 8px;">* ${idea.demandScore}% DEMAND SIGNAL</span>
        <h1 style="font-size: 22px; font-weight: 700; color: #fafafa; margin: 0 0 12px; line-height: 1.3;">${idea.title}</h1>
        <p style="font-size: 15px; color: #a1a1aa; line-height: 1.5; margin: 0 0 24px;">${idea.problem.summary}</p>
      </div>

      <!-- Who Feels It -->
      <div style="background-color: #27272a; padding: 14px 16px; border-radius: 8px; margin-bottom: 20px;">
        <div style="font-size: 12px; font-family: monospace; color: #a78bfa; text-transform: uppercase; margin-bottom: 4px;">Target User</div>
        <div style="font-size: 14px; color: #e4e4e7;">${idea.problem.whoFeelsIt}</div>
      </div>

      <!-- Matched APIs -->
      <div style="margin-bottom: 28px;">
        <div style="font-size: 12px; font-family: monospace; color: #a1a1aa; text-transform: uppercase; margin-bottom: 10px;">Matched APIs & Free Tier Limits</div>
        <ul style="margin: 0; padding-left: 20px; color: #d4d4d8; font-size: 14px; line-height: 1.6;">
          ${apisHtml}
        </ul>
      </div>

      <!-- Call to Action -->
      <div style="text-align: center; margin: 32px 0 16px;">
        <a href="${dropUrl}" style="display: inline-block; background-color: #7c3aed; color: #ffffff; font-weight: 600; font-size: 15px; padding: 12px 28px; border-radius: 8px; text-decoration: none; box-shadow: 0 4px 14px rgba(124, 58, 237, 0.4);">
          View Full Build Brief & Turnkey Prompts ->
        </a>
      </div>
      <div style="text-align: center; font-size: 12px; color: #71717a;">
        Ships with ready-to-paste prompts for Claude Code, Cursor, Windsurf, v0 & Bolt.
      </div>
    </div>

    <!-- Footer -->
    <div style="padding: 20px 28px; background-color: #121215; border-top: 1px solid #27272a; text-align: center; font-size: 12px; color: #71717a; line-height: 1.5;">
      <div>You are receiving this because you subscribed to Sourced drops.</div>
      <div style="margin-top: 6px;">
        <a href="${APP_URL}/account" style="color: #a1a1aa; text-decoration: underline;">Preferences</a> - 
        <a href="${APP_URL}/api/track/opt-out" style="color: #a1a1aa; text-decoration: underline;">Unsubscribe</a>
      </div>
    </div>
  </div>
</body>
</html>
`.trim();

  return { subject, html, text };
}

/**
 * Loads all active subscriber emails from sourced_subscribers and sourced_newsletter_signups.
 */
export async function getBroadcastRecipients(): Promise<string[]> {
  try {
    const supabase = getSupabaseServerClient();

    const [subscribersRes, signupsRes] = await Promise.all([
      supabase.from("sourced_subscribers").select("email").in("status", ["active", "trialing"]),
      supabase.from("sourced_newsletter_signups").select("email"),
    ]);

    const subscriberEmails = (subscribersRes.data || []).map((r: { email: string }) => r.email);
    const signupEmails = (signupsRes.data || []).map((r: { email: string }) => r.email);

    return deduplicateRecipients(subscriberEmails, signupEmails);
  } catch (err) {
    console.error("[Dispatcher] Error querying broadcast recipients:", err);
    return [];
  }
}

/**
 * Dispatches a published idea drop to subscribers.
 * Supports dryRun mode for safe operator previews.
 */
export async function dispatchWeeklyDrop(
  idea: IdeaDrop,
  options: DispatchOptions = {}
): Promise<DispatchResult> {
  const { dryRun = false, testRecipients } = options;
  const emailPayload = renderDropEmail(idea);

  const recipients = testRecipients && testRecipients.length > 0
    ? deduplicateRecipients(testRecipients)
    : await getBroadcastRecipients();

  if (dryRun) {
    console.log(`[Dispatcher] Dry-run complete for drop "${idea.title}". Would broadcast to ${recipients.length} recipients.`);
    return {
      success: true,
      dryRun: true,
      recipientCount: recipients.length,
      subject: emailPayload.subject,
    };
  }

  const resendApiKey = process.env.RESEND_API_KEY;

  if (resendApiKey && recipients.length > 0) {
    try {
      // Chunk into batches of 50 to respect provider limits
      const chunkSize = 50;
      for (let i = 0; i < recipients.length; i += chunkSize) {
        const batch = recipients.slice(i, i + chunkSize);
        const res = await fetch("https://api.resend.com/emails/batch", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${resendApiKey}`,
          },
          body: JSON.stringify(
            batch.map((to) => ({
              from: process.env.EMAIL_FROM || "Sourced Drops <drops@getsourced.dev>",
              to,
              subject: emailPayload.subject,
              html: emailPayload.html,
              text: emailPayload.text,
            }))
          ),
        });

        if (!res.ok) {
          const errText = await res.text().catch(() => "");
          console.error(`[Dispatcher] Resend batch failed (${res.status}):`, errText);
        }
      }
    } catch (err) {
      console.error("[Dispatcher] Unexpected error sending via Resend:", err);
    }
  } else {
    console.log(`[Dispatcher] RESEND_API_KEY not configured. Simulated delivery for ${recipients.length} recipients.`);
  }

  // Notify operator on phone via ntfy
  await notify({
    title: `Drop Broadcast: ${idea.title}`,
    message: `Dispatched to ${recipients.length} subscriber(s).`,
    tags: ["mega", "tada"],
    priority: 3,
  });

  // Track event in events table
  await track({
    eventType: "drop_broadcast_sent",
    path: `/feed/${idea.slug}`,
    metadata: {
      ideaId: idea.id,
      slug: idea.slug,
      recipientCount: recipients.length,
    },
  });

  return {
    success: true,
    dryRun: false,
    recipientCount: recipients.length,
    subject: emailPayload.subject,
  };
}