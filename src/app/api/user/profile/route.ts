import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { AccessStatus } from '@prisma/client';
import { prisma } from '@/lib/db';
import { mascotSkins } from '@/data/mascotSkins';
import { ensureUserPlan } from '@/lib/userPlan';

const allowedMascotSkins = new Set(mascotSkins.map((skin) => skin.id));

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const plan = await ensureUserPlan(session.user.id, session.user.email);
  if (plan.accessStatus !== AccessStatus.ACTIVE) {
    return NextResponse.json(
      {
        error:
          plan.accessStatus === AccessStatus.WAITLISTED ? 'waitlisted' : 'suspended',
      },
      { status: 403 }
    );
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
      termsAcceptedAt: true,
      privacyAcceptedAt: true,
      ageConfirmedAt: true,
      consentVersion: true,
    },
  });

  return NextResponse.json({ user });
}

export async function PATCH(request: Request) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const plan = await ensureUserPlan(session.user.id, session.user.email);
  if (plan.accessStatus !== AccessStatus.ACTIVE) {
    return NextResponse.json(
      {
        error:
          plan.accessStatus === AccessStatus.WAITLISTED ? 'waitlisted' : 'suspended',
      },
      { status: 403 }
    );
  }

  const body = await request.json();
  const updates: {
    mascotSkin?: string;
    onboardingComplete?: boolean;
    termsAcceptedAt?: Date;
    privacyAcceptedAt?: Date;
    ageConfirmedAt?: Date;
    parentEmail?: string | null;
    consentVersion?: string;
  } = {};

  if (typeof body?.mascotSkin === 'string') {
    const mascotSkinValue = body.mascotSkin.trim();
    if (!allowedMascotSkins.has(mascotSkinValue)) {
      return NextResponse.json(
        { error: 'Invalid mascot skin' },
        { status: 400 }
      );
    }
    updates.mascotSkin = mascotSkinValue;
  }

  if (typeof body?.onboardingComplete === 'boolean') {
    updates.onboardingComplete = body.onboardingComplete;
  }

  // Handle consent fields
  if (body?.termsAccepted === true) {
    const now = new Date();
    updates.termsAcceptedAt = now;
    updates.privacyAcceptedAt = now;
    updates.consentVersion = '1.0';
  }

  if (body?.ageConfirmed === true) {
    updates.ageConfirmedAt = new Date();
  }

  if (typeof body?.parentEmail === 'string') {
    const trimmed = body.parentEmail.trim();
    updates.parentEmail = trimmed.length > 0 ? trimmed : null;
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
      termsAcceptedAt: true,
      privacyAcceptedAt: true,
      ageConfirmedAt: true,
      consentVersion: true,
    },
  });

  return NextResponse.json({ user });
}
