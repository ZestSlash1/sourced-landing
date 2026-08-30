import { NextResponse, type NextFetchEvent, type NextRequest } from "next/server";
import { OPT_OUT_COOKIE, isExcludedTraffic } from "@/lib/analytics/exclusion";

/**
 * Two jobs: (1) mint the anonymous "sid" cookie used as `session_id` on
 * every events row (lib/track.ts), and (2) fire a "page_view" event for real
 * page navigations.
 *
 * The service-role Supabase client isn't reliably edge-compatible, so the
 * actual insert happens in POST /api/track (Node runtime) — this just posts
 * to it via `event.waitUntil`, which keeps the function alive to finish that
 * fetch after the response has already gone out, so it can never add
 * latency to the page itself.
 */

const SESSION_COOKIE = "sid";
const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;

const SKIP_PREFIXES = ["/_next", "/api", "/admin"];
const STATIC_FILE = /\.[a-zA-Z0-9]+$/;

export function middleware(request: NextRequest, event: NextFetchEvent) {
  const { pathname, searchParams } = request.nextUrl;

  const isNewSession = !request.cookies.get(SESSION_COOKIE)?.value;
  const sessionId = request.cookies.get(SESSION_COOKIE)?.value ?? crypto.randomUUID();

  if (isNewSession) {
    // Set it on the request too, so this same pass's downstream handlers
    // (e.g. /auth/callback) see it via cookies() without waiting for the
    // browser to send it back on a second request.
    request.cookies.set(SESSION_COOKIE, sessionId);
  }

  const response = NextResponse.next({ request });

  if (isNewSession) {
    response.cookies.set(SESSION_COOKIE, sessionId, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: ONE_YEAR_SECONDS,
      path: "/",
    });
  }

  const shouldTrack =
    request.method === "GET" &&
    !SKIP_PREFIXES.some((prefix) => pathname.startsWith(prefix)) &&
    !STATIC_FILE.test(pathname) &&
    // Own-traffic exclusion, so the owner browsing their own site doesn't
    // land on the admin globe (lib/analytics/exclusion.ts).
    !isExcludedTraffic(request.headers, Boolean(request.cookies.get(OPT_OUT_COOKIE)?.value));

  if (shouldTrack) {
    // Vercel's edge network sets these on every request in production; all
    // absent locally and on any other host, which the null fallbacks handle.
    const latitude = parseFloat(request.headers.get("x-vercel-ip-latitude") ?? "");
    const longitude = parseFloat(request.headers.get("x-vercel-ip-longitude") ?? "");
    const city = request.headers.get("x-vercel-ip-city");

    const payload = {
      eventType: "page_view",
      sessionId,
      path: pathname,
      referrer: request.headers.get("referer"),
      utmSource: searchParams.get("utm_source"),
      utmMedium: searchParams.get("utm_medium"),
      utmCampaign: searchParams.get("utm_campaign"),
      country: request.headers.get("x-vercel-ip-country"),
      city: city ? decodeURIComponent(city) : null,
      latitude: Number.isFinite(latitude) ? latitude : null,
      longitude: Number.isFinite(longitude) ? longitude : null,
    };

    event.waitUntil(
      fetch(new URL("/api/track", request.url), {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      }).catch(() => {
        // Tracking must never surface as a page error — see lib/track.ts.
      }),
    );
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
