import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

const PUBLIC_PATHS = ['/login'];
const ONBOARDING_PATH = '/onboarding';

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });

  if (PUBLIC_PATHS.includes(pathname)) {
    if (!token) {
      return NextResponse.next();
    }
    const redirectUrl = new URL(
      token.onboardingComplete ? '/' : ONBOARDING_PATH,
      req.url
    );
    return NextResponse.redirect(redirectUrl);
  }

  if (!token) {
    const loginUrl = new URL('/login', req.url);
    loginUrl.searchParams.set('from', pathname);
    return NextResponse.redirect(loginUrl);
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
