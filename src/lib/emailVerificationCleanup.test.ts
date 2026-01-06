import { describe, expect, it, vi } from 'vitest';
import { EMAIL_VERIFY_TTL_HOURS } from '@/lib/passwordAuth';

type TokenRecord = { email: string };

let expiredTokens: TokenRecord[] = [];
let activeTokens: TokenRecord[] = [];

const prismaMock = {
  emailVerificationToken: {
    findMany: vi.fn(async ({ where }: { where: { expires?: { lt?: Date; gte?: Date } } }) => {
      if (where.expires?.lt) return expiredTokens;
      if (where.expires?.gte) return activeTokens;
      return [];
    }),
    deleteMany: vi.fn(async () => ({ count: expiredTokens.length })),
  },
  user: {
    deleteMany: vi.fn(async () => ({ count: 0 })),
  },
};

vi.mock('@/lib/db', () => ({
  prisma: prismaMock,
}));

const loadCleanup = async () => {
  vi.resetModules();
  return import('@/lib/emailVerificationCleanup');
};

describe('cleanupUnverifiedUsers', () => {
  it('deletes unverified credential users after email token expiry', async () => {
    const now = new Date('2026-01-07T00:00:00Z');
    expiredTokens = [{ email: 'expired@example.com' }];
    activeTokens = [{ email: 'active@example.com' }];

    prismaMock.user.deleteMany
      .mockResolvedValueOnce({ count: 1 })
      .mockResolvedValueOnce({ count: 2 });

    const { cleanupUnverifiedUsers } = await loadCleanup();
    const result = await cleanupUnverifiedUsers(now);

    expect(prismaMock.user.deleteMany).toHaveBeenNthCalledWith(1, {
      where: {
        emailVerified: null,
        password: { not: null },
        email: { in: ['expired@example.com'] },
      },
    });

    const expectedCutoff = new Date(
      now.getTime() - EMAIL_VERIFY_TTL_HOURS * 60 * 60 * 1000
    );
    expect(prismaMock.user.deleteMany).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        where: expect.objectContaining({
          createdAt: { lt: expectedCutoff },
          email: expect.objectContaining({ notIn: ['active@example.com'] }),
        }),
      })
    );

    expect(prismaMock.emailVerificationToken.deleteMany).toHaveBeenCalledWith({
      where: { expires: { lt: now } },
    });

    expect(result).toEqual({
      deletedUsersByToken: 1,
      deletedUsersWithoutToken: 2,
      deletedTokens: 1,
    });
  });
});
