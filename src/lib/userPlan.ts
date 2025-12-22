import { AccessStatus, Plan } from '@prisma/client';
import { prisma } from '@/lib/db';
import { getMaxActiveUsers, isEmailAllowed } from '@/lib/access';

export const ensureUserPlan = async (userId: string, email?: string | null) => {
  const existing = await prisma.userPlan.findUnique({ where: { userId } });

  if (existing?.accessStatus === AccessStatus.SUSPENDED) {
    return existing;
  }

  const allowlisted = isEmailAllowed(email ?? undefined);
  let desiredStatus: AccessStatus = existing?.accessStatus ?? AccessStatus.ACTIVE;

  if (!allowlisted) {
    desiredStatus = AccessStatus.WAITLISTED;
  } else {
    const maxActiveUsers = getMaxActiveUsers();
    if (maxActiveUsers === Number.POSITIVE_INFINITY) {
      desiredStatus = AccessStatus.ACTIVE;
    } else if (existing?.accessStatus === AccessStatus.ACTIVE) {
      desiredStatus = AccessStatus.ACTIVE;
    } else {
      const activeCount = await prisma.userPlan.count({
        where: { accessStatus: AccessStatus.ACTIVE },
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
