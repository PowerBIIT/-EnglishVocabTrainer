import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { createDefaultState } from '@/lib/appState';
import type { Prisma } from '@prisma/client';
import { MAX_STATE_BYTES } from '@/lib/apiLimits';

type SessionUser = {
  id: string;
  email?: string | null;
  name?: string | null;
  image?: string | null;
  onboardingComplete?: boolean;
  mascotSkin?: string | null;
};

const ensureUserRecord = async (user: SessionUser) => {
  const existing = await prisma.user.findUnique({
    where: { id: user.id },
    select: { id: true },
  });

  if (existing) {
    return existing;
  }

  try {
    return await prisma.user.create({
      data: {
        id: user.id,
        email: user.email ?? null,
        name: user.name ?? null,
        image: user.image ?? null,
        onboardingComplete: user.onboardingComplete ?? false,
        mascotSkin: user.mascotSkin ?? 'explorer',
      },
      select: { id: true },
    });
  } catch {
    return null;
  }
};

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const user = await ensureUserRecord(session.user);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const existing = await prisma.userState.findUnique({
    where: { userId: session.user.id },
  });

  if (existing) {
    return NextResponse.json({ data: existing.data });
  }

  const defaultState = createDefaultState() as unknown as Prisma.InputJsonValue;
  const created = await prisma.userState.create({
    data: {
      userId: session.user.id,
      data: defaultState,
    },
  });

  return NextResponse.json({ data: created.data });
}

export async function PUT(request: Request) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const user = await ensureUserRecord(session.user);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const data = (body?.data ?? body) as unknown as Prisma.InputJsonValue;

  if (!data) {
    return NextResponse.json({ error: 'Missing data' }, { status: 400 });
  }

  const serialized = JSON.stringify(data);
  if (Buffer.byteLength(serialized, 'utf8') > MAX_STATE_BYTES) {
    return NextResponse.json(
      { error: 'State too large', maxBytes: MAX_STATE_BYTES },
      { status: 413 }
    );
  }

  await prisma.userState.upsert({
    where: { userId: session.user.id },
    create: { userId: session.user.id, data },
    update: { data },
  });

  return NextResponse.json({ ok: true });
}
