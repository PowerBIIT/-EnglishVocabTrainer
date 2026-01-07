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

  it('skips alert when no deletions occur', async () => {
    const now = new Date('2026-01-07T02:00:00Z');
    expiredTokens = [];
    activeTokens = [];

    prismaMock.user.deleteMany
      .mockResolvedValueOnce({ count: 0 })
      .mockResolvedValueOnce({ count: 0 });

    getAdminEmailsMock.mockReturnValue(['admin@example.com']);

    const { cleanupUnverifiedUsers } = await loadCleanup();
    await cleanupUnverifiedUsers(now);

    expect(sendEmailMock).not.toHaveBeenCalled();
    expect(setAppConfigMock).toHaveBeenCalledWith(
      expect.objectContaining({ key: 'EMAIL_VERIFICATION_CLEANUP_METRICS' })
    );
    expect(setAppConfigMock).not.toHaveBeenCalledWith(
      expect.objectContaining({ key: 'EMAIL_VERIFICATION_CLEANUP_ALERT_LAST_SENT' })
    );
  });

  it('skips alert when threshold is disabled', async () => {
    const now = new Date('2026-01-07T03:00:00Z');
    expiredTokens = [{ email: 'expired@example.com' }];

    prismaMock.user.deleteMany
      .mockResolvedValueOnce({ count: 6 })
      .mockResolvedValueOnce({ count: 5 });

    getAdminEmailsMock.mockReturnValue(['admin@example.com']);
    getAppConfigNumberMock.mockImplementation(async (key: string, fallback: number) => {
      if (key === 'EMAIL_VERIFICATION_CLEANUP_ALERT_THRESHOLD') return 0;
      return fallback;
    });

    const { cleanupUnverifiedUsers } = await loadCleanup();
    await cleanupUnverifiedUsers(now);

    expect(sendEmailMock).not.toHaveBeenCalled();
  });

  it('respects alert cooldown window', async () => {
    const now = new Date('2026-01-07T04:00:00Z');
    expiredTokens = [{ email: 'expired@example.com' }];

    prismaMock.user.deleteMany
      .mockResolvedValueOnce({ count: 8 })
      .mockResolvedValueOnce({ count: 3 });

    getAdminEmailsMock.mockReturnValue(['admin@example.com']);
    getAppConfigNumberMock.mockImplementation(async (key: string, fallback: number) => {
      if (key === 'EMAIL_VERIFICATION_CLEANUP_ALERT_THRESHOLD') return 5;
      if (key === 'EMAIL_VERIFICATION_CLEANUP_ALERT_COOLDOWN_HOURS') return 24;
      return fallback;
    });
    getAppConfigMock.mockImplementation(async (key: string) => {
      if (key === 'EMAIL_VERIFICATION_CLEANUP_ALERT_LAST_SENT') {
        return '2026-01-07T03:30:00Z';
      }
      if (key === 'EMAIL_VERIFICATION_CLEANUP_METRICS') {
        return '{"window":[1,2,3],"lastRunAt":"2026-01-06T04:00:00Z"}';
      }
      return null;
    });

    const { cleanupUnverifiedUsers } = await loadCleanup();
    await cleanupUnverifiedUsers(now);

    expect(sendEmailMock).not.toHaveBeenCalled();
  });

  it('handles invalid metrics payloads gracefully', async () => {
    const now = new Date('2026-01-07T05:00:00Z');
    expiredTokens = [{ email: 'expired@example.com' }];

    prismaMock.user.deleteMany
      .mockResolvedValueOnce({ count: 12 })
      .mockResolvedValueOnce({ count: 0 });

    getAdminEmailsMock.mockReturnValue(['admin@example.com']);
    getAppConfigNumberMock.mockImplementation(async (key: string, fallback: number) => {
      if (key === 'EMAIL_VERIFICATION_CLEANUP_ALERT_THRESHOLD') return 10;
      if (key === 'EMAIL_VERIFICATION_CLEANUP_ALERT_SPIKE_MULTIPLIER') return 2;
      return fallback;
    });
    getAppConfigMock.mockImplementation(async (key: string) => {
      if (key === 'EMAIL_VERIFICATION_CLEANUP_METRICS') {
        return '{invalid-json';
      }
      return null;
    });

    const { cleanupUnverifiedUsers } = await loadCleanup();
    await cleanupUnverifiedUsers(now);

    expect(sendEmailMock).toHaveBeenCalledTimes(1);
  });

  it('skips alert when admin emails are missing', async () => {
    const now = new Date('2026-01-07T06:00:00Z');
    expiredTokens = [{ email: 'expired@example.com' }];

    prismaMock.user.deleteMany
      .mockResolvedValueOnce({ count: 5 })
      .mockResolvedValueOnce({ count: 1 });

    getAdminEmailsMock.mockReturnValue([]);
    getAppConfigNumberMock.mockImplementation(async (key: string, fallback: number) => {
      if (key === 'EMAIL_VERIFICATION_CLEANUP_ALERT_THRESHOLD') return 3;
      return fallback;
    });

    const { cleanupUnverifiedUsers } = await loadCleanup();
    await cleanupUnverifiedUsers(now);

    expect(sendEmailMock).not.toHaveBeenCalled();
  });

  it('logs errors if sending alert fails', async () => {
    const now = new Date('2026-01-07T07:00:00Z');
    expiredTokens = [{ email: 'expired@example.com' }];

    prismaMock.user.deleteMany
      .mockResolvedValueOnce({ count: 9 })
      .mockResolvedValueOnce({ count: 2 });

    getAdminEmailsMock.mockReturnValue(['admin@example.com']);
    getAppConfigNumberMock.mockImplementation(async (key: string, fallback: number) => {
      if (key === 'EMAIL_VERIFICATION_CLEANUP_ALERT_THRESHOLD') return 5;
      return fallback;
    });
    getAppConfigMock.mockImplementation(async (key: string) => {
      if (key === 'EMAIL_VERIFICATION_CLEANUP_METRICS') {
        return 'null';
      }
      return null;
    });
    sendEmailMock.mockRejectedValueOnce(new Error('SMTP down'));

    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const { cleanupUnverifiedUsers } = await loadCleanup();
    await cleanupUnverifiedUsers(now);

    expect(sendEmailMock).toHaveBeenCalledTimes(1);
    expect(errorSpy).toHaveBeenCalledWith(
      'Email verification cleanup alert failed:',
      expect.any(Error)
    );

    errorSpy.mockRestore();
  });
});
