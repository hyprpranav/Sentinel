// middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Role-based route protection via cookie check (Firebase token validated server-side)
// The actual role enforcement happens in Firestore security rules.
// This middleware handles redirect logic for UX only.

const PUBLIC_PATHS = ['/login', '/register', '/worker', '/admin-setup', '/manager-register'];

export default function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public paths
  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // Allow static files and API routes
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.includes('.')
  ) {
    return NextResponse.next();
  }

  // Check for auth session cookie set by Firebase
  const session = request.cookies.get('__session')?.value;

  if (!session && pathname !== '/') {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
