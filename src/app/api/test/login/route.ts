import { NextResponse } from 'next/server';
import { encode } from 'next-auth/jwt';
import { prisma } from '@/lib/db';

const ensureE2EEnabled = () => {
  if (process.env.NODE_ENV === 'production' || process.env.E2E_TEST !== 'true') {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  return null;
};

const buildSessionResponse = async (email: string, password: string) => {
  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret) {
    return NextResponse.json({ error: 'Missing secret' }, { status: 500 });
  }

  const expectedPassword = process.env.E2E_TEST_PASSWORD ?? 'e2e';
  if (password !== expectedPassword) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const user = await prisma.user.upsert({
    where: { email },
    update: {},
    create: {
      email,
      name: email.split('@')[0] || 'E2E User',
      onboardingComplete: true,
      mascotSkin: 'explorer',
    },
  });

  const token = await encode({
    token: {
      name: user.name,
      email: user.email,
      sub: user.id,
      userId: user.id,
      onboardingComplete: true,
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

  return buildSessionResponse(email, password);
}
