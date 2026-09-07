/**
 * CSRF and Origin Defense:
 * Protects state-changing endpoints from Cross-Site Request Forgery and
 * unauthorized third-party form-jacking.
 */

const TRUSTED_DOMAINS = new Set([
  "getsourced.dev",
  "www.getsourced.dev",
  "localhost",
  "127.0.0.1",
]);

export interface OriginVerificationResult {
  ok: boolean;
  reason?: string;
}

export function verifySameOrigin(request: Request): OriginVerificationResult {
  const method = request.method.toUpperCase();
  if (method === "GET" || method === "HEAD" || method === "OPTIONS") {
    return { ok: true };
  }

  // Inspect Sec-Fetch-Site (present on all modern browsers)
  const secFetchSite = request.headers.get("sec-fetch-site")?.toLowerCase();
  if (secFetchSite === "cross-site") {
    return { ok: false, reason: "Cross-site request rejected by Sec-Fetch-Site" };
  }

  const originHeader = request.headers.get("origin");
  if (!originHeader) {
    // If no origin header is provided, rely on Sec-Fetch-Site if present or allow direct client calls
    return { ok: true };
  }

  try {
    const originUrl = new URL(originHeader);
    const hostHeader = request.headers.get("x-forwarded-host") || request.headers.get("host");

    if (hostHeader) {
      const normalizedHost = hostHeader.split(":")[0];
      const originHost = originUrl.hostname;

      if (
        normalizedHost === originHost ||
        originUrl.host === hostHeader ||
        TRUSTED_DOMAINS.has(originHost)
      ) {
        return { ok: true };
      }

      return {
        ok: false,
        reason: `Origin mismatch: received '${originHeader}' but host is '${hostHeader}'`,
      };
    }
  } catch {
    return { ok: false, reason: "Malformed Origin header" };
  }

  return { ok: true };
}
