import { NextResponse, type NextFetchEvent, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { OPT_OUT_COOKIE, isExcludedTraffic } from "@/lib/analytics/exclusion";
import { checkRateLimit } from "@/lib/security/rate-limit";

/**
 * Three jobs: (1) mint the anonymous "sid" cookie used as `session_id` on
 * every events row (lib/track.ts), (2) refresh and synchronize Supabase Auth
 * sessions across server components and routes, and (3) fire a "page_view"
 * event for real page navigations.
 *
 * Additionally enforces anti-scraping rate limits on public /api routes.
 */

const SESSION_COOKIE = "sid";
const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;

const SKIP_PREFIXES = ["/_next", "/api", "/admin"];
const STATIC_FILE = /\.[a-zA-Z0-9]+$/;

export async function middleware(request: NextRequest, event: NextFetchEvent) {
  const { pathname, searchParams } = request.nextUrl;

  const isNewSession = !request.cookies.get(SESSION_COOKIE)?.value;
  const sessionId = request.cookies.get(SESSION_COOKIE)?.value ?? crypto.randomUUID();

  // Enforce anti-scraping rate limiting on /api endpoints (excluding cron, webhooks, tracking)
  if (
    pathname.startsWith("/api") &&
    !pathname.startsWith("/api/cron") &&
    !pathname.startsWith("/api/webhooks") &&
    !pathname.startsWith("/api/track")
  ) {
    const callerIp =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      request.headers.get("x-real-ip") ||
      sessionId;
    const rl = checkRateLimit(`api:${callerIp}`, 60, 60_000);

    if (!rl.success) {
      return NextResponse.json(
        {
          error: "Too Many Requests",
          message: "Rate limit exceeded. Automated scraping and bulk extraction are prohibited.",
        },
        {
          status: 429,
          headers: {
            "Retry-After": "60",
            "X-RateLimit-Limit": "60",
            "X-RateLimit-Remaining": "0",
            "X-RateLimit-Reset": String(Math.ceil(rl.reset / 1000)),
          },
        }
      );
    }
  }

  if (isNewSession) {
    request.cookies.set(SESSION_COOKIE, sessionId);
  }

  let response = NextResponse.next({ request });

  // Refresh and sync Supabase Auth session so Server Components always see fresh tokens
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (supabaseUrl && supabaseAnonKey) {
    const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    });

    await supabase.auth.getUser();
  }

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
      userAgent: request.headers.get("user-agent"),
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
