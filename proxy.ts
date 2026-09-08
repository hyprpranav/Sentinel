// proxy.ts — Next.js 16 middleware (renamed from middleware.ts)
// Auth enforcement is handled client-side by each layout's AuthProvider + role check.
// This middleware only handles basic public/static path passthrough.
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export default function proxy(_request: NextRequest) {
  // Allow everything — role-based redirects are handled in each layout's
  // useEffect (AdminShell, ManagerShell, WorkerShell) via Firebase client auth.
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
