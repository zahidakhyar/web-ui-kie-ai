import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

async function sha256(message: string): Promise<string> {
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. Webhook callbacks: POST to /api/callback
  if (pathname === '/api/callback' && request.method === 'POST') {
    return NextResponse.next();
  }

  // 2. Login page, next static assets, favicon
  if (
    pathname === '/login' ||
    pathname.startsWith('/_next') ||
    pathname === '/favicon.ico'
  ) {
    return NextResponse.next();
  }

  // 3. Static public assets
  if (pathname.startsWith('/images') || pathname.startsWith('/uploads')) {
    return NextResponse.next();
  }

  const password = process.env.ADMIN_PASSWORD;
  const secret = process.env.AUTH_SECRET;

  // If the password is not set, don't lock the website to avoid locking out the user initially
  if (!password) {
    console.warn('ADMIN_PASSWORD is not set. Access granted without auth.');
    return NextResponse.next();
  }

  // AUTH_SECRET is required once a password is set — never fall back to a
  // hardcoded salt, since that string is public in this open-source repo.
  if (!secret) {
    console.warn('AUTH_SECRET is not set. Denying access until it is configured.');
    return NextResponse.redirect(new URL('/login', request.url));
  }

  const cookie = request.cookies.get('auth_session')?.value;

  if (!cookie) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  const parts = cookie.split(':');
  if (parts.length !== 2) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  const [expiryStr, signature] = parts;
  const expiry = parseInt(expiryStr, 10);

  if (isNaN(expiry) || expiry < Date.now()) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // Compute the expected signature
  const expectedSignature = await sha256(`${expiry}:${password}:${secret}`);

  if (signature !== expectedSignature) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all paths except static files
     */
    '/((?!_next/static|_next/image|favicon.ico|images/|uploads/).*)',
  ],
};
