import { describe, it, expect, beforeEach, vi } from 'vitest';
import { logAnalyticsEvent } from './analytics';
import { prisma } from '@/lib/db';

const prismaMock = vi.hoisted(() => ({
  analyticsEvent: {
    create: vi.fn().mockResolvedValue({ id: 'event-1' }),
    deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
  },
  analyticsDailyStat: {
    upsert: vi.fn().mockResolvedValue({ id: 'stat-1' }),
    deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
  },
  $transaction: vi.fn().mockResolvedValue([]),
}));

vi.mock('@/lib/db', () => ({
  prisma: prismaMock,
}));

const flushPromises = () => new Promise((resolve) => setImmediate(resolve));

describe('analytics', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates analytics records for valid events', async () => {
    await logAnalyticsEvent({
      userId: 'user-123',
      eventName: ' Quiz_Started ',
      feature: ' Quiz ',
      source: ' UI ',
      metadata: { path: '/quiz' },
    });

    expect(prisma.analyticsEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: 'user-123',
          eventName: 'quiz_started',
          feature: 'quiz',
          source: 'ui',
        }),
      })
    );
    expect(prisma.analyticsDailyStat.upsert).toHaveBeenCalled();

    await flushPromises();
    expect(prisma.$transaction).toHaveBeenCalled();
  });

  it('drops invalid event names', async () => {
    await logAnalyticsEvent({
      userId: 'user-123',
      eventName: ' ',
    });

    expect(prisma.analyticsEvent.create).not.toHaveBeenCalled();
    expect(prisma.analyticsDailyStat.upsert).not.toHaveBeenCalled();
  });

  it('truncates oversized metadata payloads', async () => {
    await logAnalyticsEvent({
      userId: 'user-123',
      eventName: 'page_view',
      metadata: { payload: 'a'.repeat(6000) },
    });

    const createCall = vi.mocked(prisma.analyticsEvent.create).mock.calls[0][0];
    expect(createCall.data.metadata).toEqual({ truncated: true });
  });
});
