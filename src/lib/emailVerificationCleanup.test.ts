import { beforeEach, describe, expect, it, vi } from 'vitest';
import { EMAIL_VERIFY_TTL_HOURS } from '@/lib/passwordAuth';

type TokenRecord = { email: string };

let expiredTokens: TokenRecord[] = [];
let activeTokens: TokenRecord[] = [];

const sendEmailMock = vi.fn();
const getAdminEmailsMock = vi.fn(() => []);
const getAppConfigMock = vi.fn();
const getAppConfigNumberMock = vi.fn();
const setAppConfigMock = vi.fn();

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

vi.mock('@/lib/access', () => ({
  getAdminEmails: getAdminEmailsMock,
}));

vi.mock('@/lib/config', () => ({
  getAppConfig: getAppConfigMock,
  getAppConfigNumber: getAppConfigNumberMock,
  setAppConfig: setAppConfigMock,
}));

vi.mock('@/lib/email', () => ({
  sendEmail: sendEmailMock,
}));

const loadCleanup = async () => {
  vi.resetModules();
  return import('@/lib/emailVerificationCleanup');
};

describe('cleanupUnverifiedUsers', () => {
  beforeEach(() => {
    expiredTokens = [];
    activeTokens = [];
    prismaMock.user.deleteMany.mockReset();
    prismaMock.emailVerificationToken.deleteMany.mockClear();
    sendEmailMock.mockReset();
    getAdminEmailsMock.mockReset();
    getAdminEmailsMock.mockReturnValue([]);
    getAppConfigMock.mockReset();
    getAppConfigMock.mockResolvedValue(null);
    getAppConfigNumberMock.mockReset();
    getAppConfigNumberMock.mockImplementation(async (_key: string, fallback: number) => fallback);
    setAppConfigMock.mockReset();
    prismaMock.emailVerificationToken.deleteMany.mockImplementation(
      async () => ({ count: expiredTokens.length })
    );
  });

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

  it('sends an alert when cleanup deletions spike', async () => {
    const now = new Date('2026-01-07T01:00:00Z');
    expiredTokens = [{ email: 'expired@example.com' }];

    prismaMock.user.deleteMany
      .mockResolvedValueOnce({ count: 4 })
      .mockResolvedValueOnce({ count: 7 });

    getAdminEmailsMock.mockReturnValue(['admin@example.com']);
    getAppConfigNumberMock.mockImplementation(async (key: string, fallback: number) => {
      if (key === 'EMAIL_VERIFICATION_CLEANUP_ALERT_THRESHOLD') return 5;
      if (key === 'EMAIL_VERIFICATION_CLEANUP_ALERT_SPIKE_MULTIPLIER') return 2;
      if (key === 'EMAIL_VERIFICATION_CLEANUP_ALERT_WINDOW') return 3;
      if (key === 'EMAIL_VERIFICATION_CLEANUP_ALERT_COOLDOWN_HOURS') return 24;
      return fallback;
    });
    getAppConfigMock.mockImplementation(async (key: string) => {
      if (key === 'EMAIL_VERIFICATION_CLEANUP_METRICS') {
        return JSON.stringify({ window: [2, 3, 4], lastRunAt: '2026-01-06T01:00:00Z' });
      }
      if (key === 'EMAIL_VERIFICATION_CLEANUP_ALERT_LAST_SENT') return null;
      return null;
    });

    const { cleanupUnverifiedUsers } = await loadCleanup();
    await cleanupUnverifiedUsers(now);

    expect(sendEmailMock).toHaveBeenCalledTimes(1);
    expect(setAppConfigMock).toHaveBeenCalledWith(
      expect.objectContaining({ key: 'EMAIL_VERIFICATION_CLEANUP_METRICS' })
    );
    expect(setAppConfigMock).toHaveBeenCalledWith(
      expect.objectContaining({ key: 'EMAIL_VERIFICATION_CLEANUP_ALERT_LAST_SENT' })
    );
  });
});
