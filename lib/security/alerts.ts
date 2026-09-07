import "server-only";
import { notify } from "@/lib/notify";

export type SecurityIncidentType =
  | "admin_unauthorized_access"
  | "webhook_signature_forgery"
  | "rate_limit_breach"
  | "export_security_tamper";

export interface SecurityIncident {
  type: SecurityIncidentType;
  message: string;
  sourceIp?: string | null;
  path?: string | null;
  metadata?: Record<string, unknown>;
}

/**
 * Dispatches real-time security alerts via ntfy push notifications to the
 * operator's device whenever suspicious or unauthorized activity occurs.
 * Never throws — a notification failure must never break core request handling.
 */
export async function recordSecurityIncident(incident: SecurityIncident): Promise<void> {
  const title = `🚨 Security Alert: ${incident.type}`;
  const details = [
    incident.message,
    incident.sourceIp ? `IP: ${incident.sourceIp}` : null,
    incident.path ? `Path: ${incident.path}` : null,
    incident.metadata ? `Meta: ${JSON.stringify(incident.metadata)}` : null,
    `Time: ${new Date().toISOString()}`,
  ]
    .filter(Boolean)
    .join("\n");

  await notify({
    title,
    message: details,
    tags: ["warning", "rotating_light"],
    priority: 4,
  });
}
