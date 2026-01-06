import { prisma } from '@/lib/db';
import { EMAIL_VERIFY_TTL_HOURS } from '@/lib/passwordAuth';

const normalizeEmail = (email: string) => email.trim().toLowerCase();

const uniqueEmails = (entries: Array<{ email: string }>) => {
  const seen = new Set<string>();
  entries.forEach((entry) => {
    if (!entry.email) return;
    seen.add(normalizeEmail(entry.email));
  });
  return Array.from(seen);
};

export type EmailVerificationCleanupResult = {
  deletedUsersByToken: number;
  deletedUsersWithoutToken: number;
  deletedTokens: number;
};

export const cleanupUnverifiedUsers = async (
  now: Date = new Date()
): Promise<EmailVerificationCleanupResult> => {
  const cutoff = new Date(
    now.getTime() - EMAIL_VERIFY_TTL_HOURS * 60 * 60 * 1000
  );

  const expiredTokens = await prisma.emailVerificationToken.findMany({
    where: { expires: { lt: now } },
    select: { email: true },
  });
  const expiredEmails = uniqueEmails(expiredTokens);

  let deletedUsersByToken = 0;
  if (expiredEmails.length > 0) {
    const result = await prisma.user.deleteMany({
      where: {
        emailVerified: null,
        password: { not: null },
        email: { in: expiredEmails },
      },
    });
    deletedUsersByToken = result.count;
  }

  const activeTokens = await prisma.emailVerificationToken.findMany({
    where: { expires: { gte: now } },
    select: { email: true },
  });
  const activeEmails = uniqueEmails(activeTokens);
  const emailFilter: { not?: null; notIn?: string[] } = { not: null };
  if (activeEmails.length > 0) {
    emailFilter.notIn = activeEmails;
  }

  const staleUsers = await prisma.user.deleteMany({
    where: {
      emailVerified: null,
      password: { not: null },
      createdAt: { lt: cutoff },
      email: emailFilter,
    },
  });

  const deletedTokens = await prisma.emailVerificationToken.deleteMany({
    where: { expires: { lt: now } },
  });

  return {
    deletedUsersByToken,
    deletedUsersWithoutToken: staleUsers.count,
    deletedTokens: deletedTokens.count,
  };
};
