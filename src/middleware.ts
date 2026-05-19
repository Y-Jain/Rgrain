// Proxy implementation for security and RBAC
// Force re-evaluation
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifyToken } from '@/lib/auth-utils';

const templatePermissions: Record<string, string[]> = {
  "Weighman": ["Weighbridge", "Farmers"],
  "Cashier": ["Farmers", "Ledger", "Approvals"],
  "Godown Keeper": ["Stock", "Small Scale"],
  "Small Scale": ["Small Scale", "Farmers"],
  "General Labor": [],
};

const moduleRoutes: Record<string, string> = {
  "Weighbridge": "/dashboard/weighbridge",
  "Small Scale": "/dashboard/small-scale",
  "Farmers": "/dashboard/farmers",
  "Ledger": "/dashboard/ledger",
  "Approvals": "/dashboard/approvals",
  "Stock": "/dashboard/stock",
};

const routeRequiredModules: Record<string, string> = {
  "/dashboard/weighbridge": "Weighbridge",
  "/dashboard/small-scale": "Small Scale",
  "/dashboard/farmers": "Farmers",
  "/dashboard/ledger": "Ledger",
  "/dashboard/approvals": "Approvals",
  "/dashboard/stock": "Stock",
};

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
    if (pathname.startsWith('/api')) {
      const response = NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      response.cookies.delete('auth-token');
      return response;
    }
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
      const template = (payload.permissions as any)?.template;
      const templates = typeof template === 'string' ? template.split(',').map((t: string) => t.trim()) : [];
      const allowedModules: string[] = [];
      templates.forEach((t: string) => {
        if (templatePermissions[t]) {
          allowedModules.push(...templatePermissions[t]);
        }
      });
      let firstRoute = '/dashboard';
      if (allowedModules.length > 0) {
        for (const mod of allowedModules) {
          if (moduleRoutes[mod]) {
            firstRoute = moduleRoutes[mod];
            break;
          }
        }
      }
      return NextResponse.redirect(new URL(firstRoute, request.url));
    }
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  // 7. RBAC: Superadmin panel protection
  if (pathname.startsWith('/superadmin') && payload.role !== 'superadmin') {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  // 8. RBAC: Dashboard Protection for Staff
  if (payload.role === 'staff') {
    const template = (payload.permissions as any)?.template;
    const templates = typeof template === 'string' ? template.split(',').map((t: string) => t.trim()) : [];
    const allowedModules: string[] = [];
    templates.forEach((t: string) => {
      if (templatePermissions[t]) {
        allowedModules.push(...templatePermissions[t]);
      }
    });

    let firstRoute = '/dashboard';
    if (allowedModules.length > 0) {
      for (const mod of allowedModules) {
        if (moduleRoutes[mod]) {
          firstRoute = moduleRoutes[mod];
          break;
        }
      }
    }

    // A. Main Dashboard Overview protection
    if (pathname === '/dashboard') {
      if (allowedModules.length === 0) {
        return NextResponse.next(); // General labor can access main dashboard overview
      }
      return NextResponse.redirect(new URL(firstRoute, request.url));
    }

    // B. Admin-only routes protection
    const adminRoutes = ['/dashboard/rates', '/dashboard/staff'];
    if (adminRoutes.some(route => pathname.startsWith(route))) {
      return NextResponse.redirect(new URL(firstRoute, request.url));
    }

    // C. Module-based page protection
    for (const [route, moduleName] of Object.entries(routeRequiredModules)) {
      if (pathname.startsWith(route)) {
        if (!allowedModules.includes(moduleName)) {
          return NextResponse.redirect(new URL(firstRoute, request.url));
        }
      }
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

