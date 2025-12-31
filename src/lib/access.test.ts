import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';
import { getAppConfig, getAppConfigNumber } from '@/lib/config';

vi.mock('@/lib/config', () => ({
  getAppConfig: vi.fn(),
  getAppConfigNumber: vi.fn(),
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

  it('checks allowlist with admin bypass', async () => {
    process.env.ADMIN_EMAILS = 'admin@example.com';
    vi.mocked(getAppConfig).mockResolvedValue('user@example.com');
    const { isEmailAllowed } = await loadAccess();

    await expect(isEmailAllowed('user@example.com')).resolves.toBe(true);
    await expect(isEmailAllowed('admin@example.com')).resolves.toBe(true);
    await expect(isEmailAllowed('blocked@example.com')).resolves.toBe(false);
  });

  it('allows all emails when allowlist is empty', async () => {
    process.env.ADMIN_EMAILS = '';
    vi.mocked(getAppConfig).mockResolvedValue('');
    const { isEmailAllowed } = await loadAccess();

    await expect(isEmailAllowed(undefined)).resolves.toBe(true);
    await expect(isEmailAllowed('anyone@example.com')).resolves.toBe(true);
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
