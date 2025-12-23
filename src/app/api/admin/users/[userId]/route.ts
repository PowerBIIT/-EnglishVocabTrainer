import { NextResponse } from 'next/server';
import type { Prisma } from '@prisma/client';
import { AccessStatus, Plan } from '@prisma/client';
import { prisma } from '@/lib/db';
import { getAdminEmails, getMaxActiveUsers, isAdminEmail } from '@/lib/access';
import { requireAdmin } from '@/middleware/adminAuth';

const isPlan = (value: string): value is Plan => value === 'FREE' || value === 'PRO';
const isAccessStatus = (value: string): value is AccessStatus =>
  value === 'ACTIVE' || value === 'WAITLISTED' || value === 'SUSPENDED';

export async function PATCH(
  request: Request,
  { params }: { params: { userId: string } }
) {
  const session = await requireAdmin();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const userId = params.userId;
  if (!userId) {
    return NextResponse.json({ error: 'Missing user id' }, { status: 400 });
  }

  const body = await request.json();
  const accessStatus = typeof body?.accessStatus === 'string' ? body.accessStatus : undefined;
  const plan = typeof body?.plan === 'string' ? body.plan : undefined;

  if (
    (accessStatus && !isAccessStatus(accessStatus)) ||
    (plan && !isPlan(plan))
  ) {
    return NextResponse.json({ error: 'Invalid status or plan value' }, { status: 400 });
  }

  if (!accessStatus && !plan) {
    return NextResponse.json({ error: 'No updates provided' }, { status: 400 });
  }

  if (accessStatus === 'SUSPENDED' && session.user.id === userId) {
    return NextResponse.json({ error: 'Cannot suspend yourself' }, { status: 400 });
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true, plan: true },
  });

  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  const updates: Prisma.UserPlanUpdateInput = {};
  if (accessStatus) {
    updates.accessStatus = accessStatus;
  }
  if (plan) {
    updates.plan = plan;
  }

  if (accessStatus === 'ACTIVE' && user.plan?.accessStatus !== 'ACTIVE') {
    if (!isAdminEmail(user.email ?? undefined)) {
      const maxActiveUsers = await getMaxActiveUsers();
      if (maxActiveUsers !== Number.POSITIVE_INFINITY) {
        const adminEmails = getAdminEmails();
        const activeCount = await prisma.userPlan.count({
          where: {
            accessStatus: AccessStatus.ACTIVE,
            user: {
              email: {
                notIn: adminEmails.length > 0 ? adminEmails : undefined,
              },
            },
          },
        });

        if (activeCount >= maxActiveUsers) {
          return NextResponse.json(
            { error: 'Active user limit reached' },
            { status: 400 }
          );
        }
      }
    }
  }

  const updated = await prisma.userPlan.upsert({
    where: { userId },
    create: {
      userId,
      plan: plan && isPlan(plan) ? plan : Plan.FREE,
      accessStatus: accessStatus && isAccessStatus(accessStatus) ? accessStatus : AccessStatus.ACTIVE,
    },
    update: updates,
  });

  return NextResponse.json({
    user: {
      userId,
      email: user.email,
      plan: updated.plan,
      accessStatus: updated.accessStatus,
    },
  });
}
