import { AccessStatus, Plan } from '@prisma/client';
import { prisma } from '@/lib/db';
import {
  getMaxActiveUsers,
  isOnAllowlist,
  isWaitlistApproved,
  getAdminEmails,
  isAdminEmail,
} from '@/lib/access';

export const ensureUserPlan = async (userId: string, email?: string | null) => {
  const existing = await prisma.userPlan.findUnique({ where: { userId } });

  if (existing?.accessStatus === AccessStatus.SUSPENDED) {
    return existing;
  }

  let desiredStatus: AccessStatus = existing?.accessStatus ?? AccessStatus.ACTIVE;

  // Priority 1: Admins always get ACTIVE
  if (isAdminEmail(email ?? undefined)) {
    desiredStatus = AccessStatus.ACTIVE;
  }
  // Priority 2: VIPs on allowlist bypass the limit
  else if (await isOnAllowlist(email ?? undefined)) {
    desiredStatus = AccessStatus.ACTIVE;
  }
  // Priority 3: Approved from waitlist get ACTIVE
  else if (await isWaitlistApproved(email ?? undefined)) {
    desiredStatus = AccessStatus.ACTIVE;
  }
  // Priority 4: Already active users stay active
  else if (existing?.accessStatus === AccessStatus.ACTIVE) {
    desiredStatus = AccessStatus.ACTIVE;
  }
  // Priority 5: Check MAX_ACTIVE_USERS limit
  else {
    const maxActiveUsers = await getMaxActiveUsers();
    if (maxActiveUsers === Number.POSITIVE_INFINITY) {
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
