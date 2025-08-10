import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Protect all routes except auth
const PUBLIC_PATHS = ['/login', '/register', '/favicon.ico', '/_next', '/public'];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const isPublic = PUBLIC_PATHS.some((p) => pathname.startsWith(p) || pathname === p);
  if (isPublic) return NextResponse.next();

  const token = req.cookies.get('token')?.value || req.headers.get('authorization') || '';
  if (!token) {
    const url = req.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api).*)'],
};


