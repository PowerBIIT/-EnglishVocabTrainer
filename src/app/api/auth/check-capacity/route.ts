import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { AccessStatus } from '@prisma/client';
import { getMaxActiveUsers, getAdminEmails } from '@/lib/access';

// Force dynamic rendering to ensure fresh data
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
  try {
    const maxActiveUsers = await getMaxActiveUsers();
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

    // If unlimited, always allow
    const hasCapacity = maxActiveUsers === Number.POSITIVE_INFINITY
      ? true
      : activeCount < maxActiveUsers;

    // Debug info (temporary - remove after testing)
    return NextResponse.json({
      hasCapacity,
      _debug: {
        maxActiveUsers: maxActiveUsers === Number.POSITIVE_INFINITY ? 'INFINITY' : maxActiveUsers,
        activeCount,
        adminEmailsCount: adminEmails.length
      },
    });
  } catch (error) {
    console.error('Check capacity error:', error);
    return NextResponse.json({ hasCapacity: true, _error: String(error) });
  }
}
