import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';
import { ensureUserPlan } from '@/lib/userPlan';
import { isAdminEmail } from '@/lib/access';

vi.mock('@next-auth/prisma-adapter', () => ({
  PrismaAdapter: vi.fn(() => ({ name: 'adapter' })),
}));

vi.mock('next-auth/providers/google', () => ({
  default: vi.fn(() => ({ id: 'google' })),
}));

vi.mock('next-auth/providers/credentials', () => ({
  default: vi.fn(() => ({ id: 'credentials' })),
}));

vi.mock('@/lib/db', () => ({
  prisma: {},
}));

vi.mock('@/lib/userPlan', () => ({
  ensureUserPlan: vi.fn(),
}));

vi.mock('@/lib/access', () => ({
  isAdminEmail: vi.fn(),
}));

const loadAuth = async () => {
  vi.resetModules();
  return import('@/lib/auth');
};

describe('auth options', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.mocked(ensureUserPlan).mockReset();
    vi.mocked(isAdminEmail).mockReset();
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it('includes the E2E credentials provider when enabled', async () => {
    process.env.NODE_ENV = 'test';
    process.env.E2E_TEST = 'true';
    process.env.E2E_LOGIN_ENABLED = 'true';

    const { authOptions } = await loadAuth();
    // Google + Credentials (email/password) + E2E Credentials = 3
    expect(authOptions.providers?.length).toBe(3);
  });

  it('exposes Google and Credentials providers when E2E_LOGIN_ENABLED is missing', async () => {
    process.env.NODE_ENV = 'test';
    process.env.E2E_TEST = 'true';
    delete process.env.E2E_LOGIN_ENABLED;

    const { authOptions } = await loadAuth();
    // Google + Credentials (email/password) = 2
    expect(authOptions.providers?.length).toBe(2);
  });

  it('exposes Google and Credentials providers when E2E is disabled', async () => {
    process.env.NODE_ENV = 'production';
    delete process.env.E2E_TEST;
    delete process.env.E2E_LOGIN_ENABLED;

    const { authOptions } = await loadAuth();
    // Google + Credentials (email/password) = 2
    expect(authOptions.providers?.length).toBe(2);
  });

  it('hydrates token on user login', async () => {
    process.env.NODE_ENV = 'test';
    const { authOptions } = await loadAuth();

    vi.mocked(ensureUserPlan).mockResolvedValue({
      plan: 'PRO',
      accessStatus: 'ACTIVE',
    });
    vi.mocked(isAdminEmail).mockReturnValue(true);

    const token = await authOptions.callbacks!.jwt!({
      token: {},
      user: {
        id: 'user-1',
        email: 'user@example.com',
        onboardingComplete: true,
        mascotSkin: 'hero',
      },
      trigger: 'signIn',
    });

    expect(token.userId).toBe('user-1');
    expect(token.plan).toBe('PRO');
    expect(token.accessStatus).toBe('ACTIVE');
    expect(token.isAdmin).toBe(true);
  });

  it('syncs plan for existing tokens and applies updates', async () => {
    process.env.NODE_ENV = 'test';
    const { authOptions } = await loadAuth();

    vi.mocked(ensureUserPlan).mockResolvedValue({
      plan: 'FREE',
      accessStatus: 'ACTIVE',
    });
    vi.mocked(isAdminEmail).mockReturnValue(false);

    const token = await authOptions.callbacks!.jwt!({
      token: {
        sub: 'user-2',
        plan: null,
        accessStatus: null,
      },
      trigger: 'update',
      session: {
        onboardingComplete: false,
        mascotSkin: 'explorer',
      },
    });

    expect(token.userId).toBe('user-2');
    expect(token.plan).toBe('FREE');
    expect(token.onboardingComplete).toBe(false);
    expect(token.mascotSkin).toBe('explorer');
  });

  it('avoids resyncing plans when recently synced', async () => {
    process.env.NODE_ENV = 'test';
    const { authOptions } = await loadAuth();

    const token = await authOptions.callbacks!.jwt!({
      token: {
        userId: 'user-4',
        plan: 'FREE',
        accessStatus: 'ACTIVE',
        planSyncedAt: Date.now(),
        email: undefined,
      },
      session: {
        user: { email: 'new@example.com' },
      },
    });

    expect(vi.mocked(ensureUserPlan)).not.toHaveBeenCalled();
    expect(token.email).toBe('new@example.com');
  });

  it('maps token data into the session', async () => {
    process.env.NODE_ENV = 'test';
    const { authOptions } = await loadAuth();

    const session = await authOptions.callbacks!.session!({
      session: { user: {} },
      token: {
        userId: 'user-3',
        onboardingComplete: true,
        mascotSkin: 'hero',
        plan: 'PRO',
        accessStatus: 'ACTIVE',
        isAdmin: true,
      },
    });

    expect(session.user?.id).toBe('user-3');
    expect(session.user?.plan).toBe('PRO');
    expect(session.user?.accessStatus).toBe('ACTIVE');
    expect(session.user?.isAdmin).toBe(true);
  });
});
