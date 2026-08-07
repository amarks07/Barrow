import { NextResponse } from "next/server";

// Note: iPadOS 13+ defaults to a desktop Safari User-Agent indistinguishable
// from an actual Mac (no "iPad" token), and there's no server-side signal
// (Safari doesn't send UA Client Hints) to tell them apart — those iPads
// will fall through to the Android/APK landing page instead of redirecting.
// iPhone always identifies itself, so that case is exact.
function isIOS(userAgent) {
  return /iPhone|iPad|iPod/.test(userAgent);
}

export function proxy(request) {
  const { pathname } = request.nextUrl;
  const userAgent = request.headers.get("user-agent") || "";

  if (pathname === "/" && isIOS(userAgent)) {
    return NextResponse.redirect(new URL("/app", request.url));
  }

  // Next's public-folder static serving has no directory-index behavior
  // (no implicit /app -> /app/index.html), so the PWA's document request
  // needs an explicit rewrite. Its own assets (/app/_expo/..., manifest.json,
  // icons) are literal files under public/app and don't need this. Next
  // also 308s any "/app/" (trailing slash) to "/app" before this ever runs,
  // so only the no-slash form needs handling.
  if (pathname === "/app") {
    return NextResponse.rewrite(new URL("/app/index.html", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/", "/app"],
};
