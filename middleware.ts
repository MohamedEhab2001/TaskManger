import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET!;

function verifyTokenEdge(token: string): { role?: string } | null {
  try {
    return jwt.verify(token, JWT_SECRET) as { role?: string };
  } catch (error) {
    return null;
  }
}

export function middleware(request: NextRequest) {
  const token = request.cookies.get('auth_token')?.value;
  const { pathname } = request.nextUrl;

  if (pathname.startsWith('/admin')) {
    if (!token) {
      return NextResponse.redirect(new URL('/login', request.url));
    }

    const payload = verifyTokenEdge(token);
    if (!payload || payload.role !== 'admin') {
      return NextResponse.redirect(new URL('/app/dashboard', request.url));
    }
  }

  if (pathname.startsWith('/app') && !pathname.startsWith('/app/api')) {
    if (!token) {
      return NextResponse.redirect(new URL('/login', request.url));
    }
  }

  if ((pathname === '/login' || pathname === '/signup') && token) {
    return NextResponse.redirect(new URL('/app', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/app/:path*', '/login', '/signup', '/admin/:path*'],
};
