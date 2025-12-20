import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      name: true,
      email: true,
      image: true,
      mascotSkin: true,
      onboardingComplete: true,
    },
  });

  return NextResponse.json({ user });
}

export async function PATCH(request: Request) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const updates: { mascotSkin?: string; onboardingComplete?: boolean } = {};

  if (typeof body?.mascotSkin === 'string') {
    updates.mascotSkin = body.mascotSkin;
  }

  if (typeof body?.onboardingComplete === 'boolean') {
    updates.onboardingComplete = body.onboardingComplete;
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'No updates provided' }, { status: 400 });
  }

  const user = await prisma.user.update({
    where: { id: session.user.id },
    data: updates,
    select: {
      id: true,
      name: true,
      email: true,
      image: true,
      mascotSkin: true,
      onboardingComplete: true,
    },
  });

  return NextResponse.json({ user });
}
