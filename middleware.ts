import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

const ONBOARDING_PATH = '/onboarding';
const WAITLIST_PATH = '/waitlist';

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const isWaitlistPath =
    pathname === WAITLIST_PATH || pathname.startsWith(`${WAITLIST_PATH}/`);

  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });

  // Allow public pages for all users
  if (pathname === '/privacy' || pathname === '/terms') {
    return NextResponse.next();
  }

  // Auth pages (public when not logged in, redirect when logged in)
  const authPages = ['/register', '/forgot-password', '/reset-password'];
  if (authPages.includes(pathname)) {
    if (!token) {
      return NextResponse.next();
    }
    // Logged-in users: check waitlist first, then onboarding
    const accessStatus = (token?.accessStatus as string | undefined) ?? 'ACTIVE';
    if (accessStatus !== 'ACTIVE') {
      return NextResponse.redirect(new URL(WAITLIST_PATH, req.url));
    }
    const redirectUrl = new URL(
      token.onboardingComplete ? '/' : ONBOARDING_PATH,
      req.url
    );
    return NextResponse.redirect(redirectUrl);
  }

  // Login page: redirect logged-in users
  if (pathname === '/login') {
    if (!token) {
      return NextResponse.next();
    }
    // Check waitlist first, then onboarding
    const accessStatus = (token?.accessStatus as string | undefined) ?? 'ACTIVE';
    if (accessStatus !== 'ACTIVE') {
      return NextResponse.redirect(new URL(WAITLIST_PATH, req.url));
    }
    const redirectUrl = new URL(
      token.onboardingComplete ? '/' : ONBOARDING_PATH,
      req.url
    );
    return NextResponse.redirect(redirectUrl);
  }

  if (!token) {
    if (isWaitlistPath) {
      return NextResponse.next();
    }
    const loginUrl = new URL('/login', req.url);
    loginUrl.searchParams.set('from', pathname);
    return NextResponse.redirect(loginUrl);
  }

  const accessStatus = (token?.accessStatus as string | undefined) ?? 'ACTIVE';

  if (accessStatus !== 'ACTIVE') {
    if (!isWaitlistPath) {
      return NextResponse.redirect(new URL(WAITLIST_PATH, req.url));
    }
    return NextResponse.next();
  }

  if (isWaitlistPath) {
    return NextResponse.redirect(new URL('/', req.url));
  }

  if (pathname.startsWith('/admin') && !token?.isAdmin) {
    return NextResponse.redirect(new URL('/', req.url));
  }

  const onboardingComplete = Boolean(token.onboardingComplete);

  if (!onboardingComplete && pathname !== ONBOARDING_PATH) {
    return NextResponse.redirect(new URL(ONBOARDING_PATH, req.url));
  }

  if (onboardingComplete && pathname === ONBOARDING_PATH) {
    return NextResponse.redirect(new URL('/', req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next|favicon.ico).*)'],
};
