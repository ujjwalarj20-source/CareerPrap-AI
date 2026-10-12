import { NextRequest, NextResponse } from 'next/server';

// Cheap first gate: bounce visitors without a session cookie. The cookie is only
// *verified* by the API (GET /api/auth/me), which the dashboard calls on load.
export function middleware(req: NextRequest) {
  if (!req.cookies.has('cp_token')) {
    return NextResponse.redirect(new URL('/login', req.url));
  }
  return NextResponse.next();
}

export const config = { matcher: ['/dashboard/:path*', '/resume/:path*', '/job-description/:path*', '/analysis/:path*'] };
