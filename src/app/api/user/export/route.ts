import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userId = session.user.id;

  // Fetch all user data
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      mascotSkin: true,
      onboardingComplete: true,
      termsAcceptedAt: true,
      privacyAcceptedAt: true,
      ageConfirmedAt: true,
      consentVersion: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  const userState = await prisma.userState.findUnique({
    where: { userId },
    select: { data: true, updatedAt: true },
  });

  const userPlan = await prisma.userPlan.findUnique({
    where: { userId },
    select: { plan: true, accessStatus: true },
  });

  // Build export data
  const exportData = {
    exportedAt: new Date().toISOString(),
    exportVersion: '1.0',
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      mascotSkin: user.mascotSkin,
      onboardingComplete: user.onboardingComplete,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    },
    consent: {
      termsAcceptedAt: user.termsAcceptedAt,
      privacyAcceptedAt: user.privacyAcceptedAt,
      ageConfirmedAt: user.ageConfirmedAt,
      consentVersion: user.consentVersion,
    },
    plan: userPlan
      ? {
          plan: userPlan.plan,
          accessStatus: userPlan.accessStatus,
        }
      : null,
    state: userState
      ? {
          data: userState.data,
          updatedAt: userState.updatedAt,
        }
      : null,
  };

  // Return as downloadable JSON
  return new NextResponse(JSON.stringify(exportData, null, 2), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Content-Disposition': `attachment; filename="henio-export-${userId}-${Date.now()}.json"`,
    },
  });
}
