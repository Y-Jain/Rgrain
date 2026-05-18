// Proxy implementation for security and RBAC
// Force re-evaluation
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifyToken } from '@/lib/auth-utils';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // 1. Skip middleware for static assets
  if (
    pathname.startsWith('/_next') || 
    pathname.includes('.')
  ) {
    return NextResponse.next();
  }

  // 2. Allow public auth APIs
  if (pathname.startsWith('/api/auth')) {
    return NextResponse.next();
  }

  // 3. Get token from HTTP-only cookie
  const token = request.cookies.get('auth-token')?.value;

  // 4. Handle unauthenticated access
  if (!token) {
    // If it's an API route (other than auth), return 401
    if (pathname.startsWith('/api')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    // If it's a protected page, redirect to login
    if (pathname !== '/login') {
      return NextResponse.redirect(new URL('/login', request.url));
    }
    return NextResponse.next();
  }

  // 5. Verify token
  const payload = await verifyToken(token);
  if (!payload) {
    const response = NextResponse.redirect(new URL('/login', request.url));
    response.cookies.delete('auth-token');
    return response;
  }

  // 6. Handle authenticated access to login page
  if (pathname === '/login') {
    if (payload.role === 'superadmin') {
      return NextResponse.redirect(new URL('/superadmin/analytics', request.url));
    }
    if (payload.role === 'staff') {
      return NextResponse.redirect(new URL('/dashboard/weighbridge', request.url));
    }
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  // 7. RBAC: Superadmin panel protection
  if (pathname.startsWith('/superadmin') && payload.role !== 'superadmin') {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  // 8. RBAC: Dashboard Protection for Staff
  if (payload.role === 'staff') {
    // If accessing the main dashboard overview, redirect to weighbridge
    if (pathname === '/dashboard') {
      return NextResponse.redirect(new URL('/dashboard/weighbridge', request.url));
    }
    
    // If accessing admin-only routes, redirect to weighbridge
    const adminRoutes = ['/dashboard/rates', '/dashboard/staff'];
    if (adminRoutes.some(route => pathname.startsWith(route))) {
      return NextResponse.redirect(new URL('/dashboard/weighbridge', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/superadmin/:path*',
    '/api/:path*',
    '/login'
  ],
};

