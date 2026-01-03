import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';
import { getAppConfig, getAppConfigNumber } from '@/lib/config';

vi.mock('@/lib/config', () => ({
  getAppConfig: vi.fn(),
  getAppConfigNumber: vi.fn(),
}));

const prismaMock = {
  waitlistEntry: {
    findFirst: vi.fn(),
  },
};

vi.mock('@/lib/db', () => ({
  prisma: prismaMock,
}));

const loadAccess = async () => {
  vi.resetModules();
  return import('@/lib/access');
};

describe('access helpers', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.mocked(getAppConfig).mockReset();
    vi.mocked(getAppConfigNumber).mockReset();
    prismaMock.waitlistEntry.findFirst.mockReset();
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it('normalizes and checks admin emails', async () => {
    process.env.ADMIN_EMAILS = 'Admin@Example.com, other@example.com';
    const { isAdminEmail, getAdminEmails } = await loadAccess();

    expect(isAdminEmail('admin@example.com')).toBe(true);
    expect(isAdminEmail('OTHER@example.com')).toBe(true);
    expect(isAdminEmail('missing@example.com')).toBe(false);
    expect(getAdminEmails()).toEqual(['admin@example.com', 'other@example.com']);
  });

  it('returns allowlist emails from config', async () => {
    process.env.ADMIN_EMAILS = '';
    vi.mocked(getAppConfig).mockResolvedValue(' one@example.com; two@example.com ');
    const { getAllowlistEmails } = await loadAccess();

    await expect(getAllowlistEmails()).resolves.toEqual([
      'one@example.com',
      'two@example.com',
    ]);
  });

  it('checks if email is on VIP allowlist', async () => {
    process.env.ADMIN_EMAILS = '';
    vi.mocked(getAppConfig).mockResolvedValue('vip@example.com, special@example.com');
    const { isOnAllowlist } = await loadAccess();

    await expect(isOnAllowlist('vip@example.com')).resolves.toBe(true);
    await expect(isOnAllowlist('special@example.com')).resolves.toBe(true);
    await expect(isOnAllowlist('regular@example.com')).resolves.toBe(false);
    await expect(isOnAllowlist(undefined)).resolves.toBe(false);
  });

  it('returns false for allowlist when list is empty', async () => {
    process.env.ADMIN_EMAILS = '';
    vi.mocked(getAppConfig).mockResolvedValue('');
    const { isOnAllowlist } = await loadAccess();

    await expect(isOnAllowlist('anyone@example.com')).resolves.toBe(false);
  });

  it('checks if email is approved via waitlist', async () => {
    process.env.ADMIN_EMAILS = '';
    prismaMock.waitlistEntry.findFirst.mockResolvedValueOnce({ id: 'waitlist-1' });
    prismaMock.waitlistEntry.findFirst.mockResolvedValueOnce(null);
    const { isWaitlistApproved } = await loadAccess();

    await expect(isWaitlistApproved('approved@example.com')).resolves.toBe(true);
    await expect(isWaitlistApproved('pending@example.com')).resolves.toBe(false);
    await expect(isWaitlistApproved(undefined)).resolves.toBe(false);
  });

  it('normalizes max active users', async () => {
    process.env.ADMIN_EMAILS = '';
    vi.mocked(getAppConfigNumber)
      .mockResolvedValueOnce(100)
      .mockResolvedValueOnce(-5)
      .mockResolvedValueOnce(Number.POSITIVE_INFINITY);

    const { getMaxActiveUsers } = await loadAccess();

    await expect(getMaxActiveUsers()).resolves.toBe(100);
    await expect(getMaxActiveUsers()).resolves.toBe(Number.POSITIVE_INFINITY);
    await expect(getMaxActiveUsers()).resolves.toBe(Number.POSITIVE_INFINITY);
  });
});
