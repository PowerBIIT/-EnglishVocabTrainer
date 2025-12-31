import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';
import { checkRateLimit } from '@/lib/rateLimit';

const prismaMock = vi.hoisted(() => ({
  rateLimitWindow: {
    upsert: vi.fn(),
    deleteMany: vi.fn(),
  },
}));

vi.mock('@/lib/db', () => ({
  prisma: prismaMock,
}));

describe('rate limiter', () => {
  beforeEach(() => {
    prismaMock.rateLimitWindow.upsert.mockReset();
    prismaMock.rateLimitWindow.deleteMany.mockReset();
    const globalForRateLimit = globalThis as { rateLimitStore?: Map<string, unknown>; rateLimitCleanupAt?: number };
    globalForRateLimit.rateLimitStore?.clear();
    globalForRateLimit.rateLimitCleanupAt = 0;
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-01-01T00:00:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('allows requests under the limit', async () => {
    prismaMock.rateLimitWindow.upsert.mockResolvedValue({
      count: 1,
      resetAt: new Date('2024-01-01T00:01:00.000Z'),
    });

    const result = await checkRateLimit('key-1', { limit: 2, windowMs: 60_000 });

    expect(result).toEqual({ ok: true });
    expect(prismaMock.rateLimitWindow.deleteMany).toHaveBeenCalled();
  });

  it('blocks requests over the limit', async () => {
    prismaMock.rateLimitWindow.upsert.mockResolvedValue({
      count: 3,
      resetAt: new Date('2024-01-01T00:01:00.000Z'),
    });

    const result = await checkRateLimit('key-2', { limit: 2, windowMs: 60_000 });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.retryAfter).toBeGreaterThan(0);
    }
  });

  it('falls back to in-memory limiter on database error', async () => {
    prismaMock.rateLimitWindow.upsert.mockRejectedValue(new Error('db down'));

    const first = await checkRateLimit('key-3', { limit: 1, windowMs: 60_000 });
    const second = await checkRateLimit('key-3', { limit: 1, windowMs: 60_000 });

    expect(first.ok).toBe(true);
    expect(second.ok).toBe(false);
  });
});
