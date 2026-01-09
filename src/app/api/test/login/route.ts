import { NextResponse } from 'next/server';
import { encode } from 'next-auth/jwt';
import { prisma } from '@/lib/db';

const ensureE2EEnabled = () => {
  // SECURITY: E2E login requires explicit opt-in via E2E_LOGIN_ENABLED=true (UAT only)
  const isE2ELoginEnabled = process.env.E2E_LOGIN_ENABLED === 'true';
  const isE2E =
    process.env.E2E_TEST === 'true' || process.env.NEXT_PUBLIC_E2E_TEST === 'true';

  if (!isE2ELoginEnabled || !isE2E) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  return null;
};

const buildSessionResponse = async (
  email: string,
  password: string,
  onboardingComplete: boolean
) => {
  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret) {
    return NextResponse.json({ error: 'Missing secret' }, { status: 500 });
  }

  const expectedPassword = process.env.E2E_TEST_PASSWORD;
  // SECURITY: Require explicit password, no default
  if (!expectedPassword) {
    return NextResponse.json({ error: 'E2E not configured' }, { status: 500 });
  }
  if (password !== expectedPassword) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const user = await prisma.user.upsert({
    where: { email },
    update: { onboardingComplete },
    create: {
      email,
      name: email.split('@')[0] || 'E2E User',
      onboardingComplete,
      mascotSkin: 'explorer',
    },
  });

  const token = await encode({
    token: {
      name: user.name,
      email: user.email,
      sub: user.id,
      userId: user.id,
      onboardingComplete,
      mascotSkin: user.mascotSkin,
    },
    secret,
  });

  const isSecure = process.env.NEXTAUTH_URL?.startsWith('https://') ?? false;
  const cookieName = isSecure
    ? '__Secure-next-auth.session-token'
    : 'next-auth.session-token';

  const response = NextResponse.json({ ok: true });
  response.cookies.set({
    name: cookieName,
    value: token,
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    secure: isSecure,
  });

  return response;
};

export async function POST(request: Request) {
  const guard = ensureE2EEnabled();
  if (guard) return guard;

  const body = await request.json();
  const email = String(body?.email || 'e2e@local.test');
  const password = String(body?.password || '');
  const onboardingComplete =
    typeof body?.onboardingComplete === 'boolean' ? body.onboardingComplete : true;

  return buildSessionResponse(email, password, onboardingComplete);
}
