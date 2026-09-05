import { NextResponse } from "next/server";
import { OPT_OUT_COOKIE, OPT_OUT_MAX_AGE_SECONDS, clientIp } from "@/lib/analytics/exclusion";

export const dynamic = "force-dynamic";

function page(heading: string, body: string, action: string): string {
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex"><title>${heading} | Sourced</title>
<style>
  body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;
    background:#FAF9F7;color:#17161A;
    font:16px/1.55 ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif}
  main{max-width:30rem;padding:2rem 2.25rem;background:#fff;border:1px solid #E7E4DF;
    border-radius:16px;box-shadow:0 1px 2px rgba(0,0,0,.04)}
  h1{font-size:1.25rem;margin:0 0 .6rem}
  p{margin:0 0 1rem;color:#6B6771}
  code{font:13px ui-monospace,SFMono-Regular,Menlo,monospace;background:#F3F1EE;
    padding:.15rem .4rem;border-radius:5px;color:#17161A}
</style></head>
<body><main><h1>${heading}</h1><p>${body}</p><p>${action}</p></main></body></html>`;
}

/**
 * GET /api/track/opt-out — excludes the calling browser from analytics by
 * setting a long-lived cookie that middleware.ts and POST /api/track both
 * check before recording anything. Visit it once per browser you use to
 * look at your own site.
 *
 * `?undo=1` clears the cookie and resumes counting. Deliberately open (no
 * auth): the only thing it can do is stop recording the caller's own
 * traffic, which is the same promise a Do Not Track header makes.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const undo = url.searchParams.get("undo") !== null;
  const rawIp = clientIp(request.headers) ?? "unknown";
  const isSafeIp = /^([0-9]{1,3}\.){3}[0-9]{1,3}$|^[a-fA-F0-9:]+$/.test(rawIp.trim());
  const ip = isSafeIp ? rawIp.trim() : "unknown";

  const response = new NextResponse(
    undo
      ? page(
          "Analytics tracking resumed",
          "This browser is being counted in the Sourced analytics again.",
          `Seen from <code>${ip}</code>. To exclude it again, visit <code>/api/track/opt-out</code>.`,
        )
      : page(
          "This browser is no longer counted",
          "Your visits from this browser won't be recorded as page views, and won't show up on the admin globe.",
          `Seen from <code>${ip}</code>. To start counting this browser again, visit <code>/api/track/opt-out?undo=1</code>.`,
        ),
    { headers: { "content-type": "text/html; charset=utf-8" } },
  );

  if (undo) {
    response.cookies.delete(OPT_OUT_COOKIE);
  } else {
    response.cookies.set(OPT_OUT_COOKIE, "1", {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: OPT_OUT_MAX_AGE_SECONDS,
      path: "/",
    });
  }

  return response;
}
