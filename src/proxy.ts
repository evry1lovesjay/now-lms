import { NextResponse, type NextRequest } from "next/server";

// Optimistic check only: send visitors without a session cookie to /login.
// Real authorization (role + blocked status) happens on the server for every
// page, action and API route via lib/auth.ts.
export function proxy(request: NextRequest) {
  if (!request.cookies.has("lms_session")) {
    const url = new URL("/login", request.url);
    url.searchParams.set("next", request.nextUrl.pathname);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/tutor/:path*", "/student/:path*", "/courses/:slug/lessons/:path*", "/courses/:slug/assignments/:path*"],
};
