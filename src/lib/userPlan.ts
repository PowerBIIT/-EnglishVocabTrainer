import { AccessStatus, Plan } from '@prisma/client';
import { prisma } from '@/lib/db';
import { getMaxActiveUsers, isEmailAllowed, getAdminEmails, isAdminEmail } from '@/lib/access';

export const ensureUserPlan = async (userId: string, email?: string | null) => {
  const existing = await prisma.userPlan.findUnique({ where: { userId } });

  if (existing?.accessStatus === AccessStatus.SUSPENDED) {
    return existing;
  }

  const allowlisted = await isEmailAllowed(email ?? undefined);
  let desiredStatus: AccessStatus = existing?.accessStatus ?? AccessStatus.ACTIVE;

  if (!allowlisted) {
    desiredStatus = AccessStatus.WAITLISTED;
  } else if (isAdminEmail(email ?? undefined)) {
    // Admini zawsze dostają ACTIVE, niezależnie od limitu użytkowników
    desiredStatus = AccessStatus.ACTIVE;
  } else {
    const maxActiveUsers = await getMaxActiveUsers();
    if (maxActiveUsers === Number.POSITIVE_INFINITY) {
      desiredStatus = AccessStatus.ACTIVE;
    } else if (existing?.accessStatus === AccessStatus.ACTIVE) {
      desiredStatus = AccessStatus.ACTIVE;
    } else {
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
      desiredStatus = activeCount < maxActiveUsers ? AccessStatus.ACTIVE : AccessStatus.WAITLISTED;
    }
  }

  if (!existing) {
    return prisma.userPlan.create({
      data: {
        userId,
        plan: Plan.FREE,
        accessStatus: desiredStatus,
      },
    });
  }

  if (existing.accessStatus !== desiredStatus) {
    return prisma.userPlan.update({
      where: { userId },
      data: { accessStatus: desiredStatus },
    });
  }

  return existing;
};

export const getUserPlan = async (userId: string) => {
  return prisma.userPlan.findUnique({ where: { userId } });
};
