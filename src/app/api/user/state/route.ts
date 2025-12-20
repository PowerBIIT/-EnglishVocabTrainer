import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { createDefaultState } from '@/lib/appState';
import type { Prisma } from '@prisma/client';

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
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

  const body = await request.json();
  const data = (body?.data ?? body) as unknown as Prisma.InputJsonValue;

  if (!data) {
    return NextResponse.json({ error: 'Missing data' }, { status: 400 });
  }

  await prisma.userState.upsert({
    where: { userId: session.user.id },
    create: { userId: session.user.id, data },
    update: { data },
  });

  return NextResponse.json({ ok: true });
}
