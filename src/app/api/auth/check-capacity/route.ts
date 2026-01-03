import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { AccessStatus } from '@prisma/client';
import { getMaxActiveUsers, getAdminEmails } from '@/lib/access';

export async function GET() {
  try {
    const maxActiveUsers = await getMaxActiveUsers();

    // If unlimited, always allow
    if (maxActiveUsers === Number.POSITIVE_INFINITY) {
      return NextResponse.json({ hasCapacity: true });
    }

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

    const hasCapacity = activeCount < maxActiveUsers;

    return NextResponse.json({
      hasCapacity,
      // Don't expose exact numbers for security
    });
  } catch (error) {
    console.error('Check capacity error:', error);
    // On error, assume capacity available to not block registration
    return NextResponse.json({ hasCapacity: true });
  }
}
