import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  createTelemetryContext,
  getFeatureFromPath,
  logAiRequest,
  logAiRequestError,
  completeTelemetry,
} from './aiTelemetry';
import { prisma } from '@/lib/db';
import { calculateTokenCost } from '@/lib/costEstimation';
import { maybeNotifyAiCostAlert } from '@/lib/aiCostAlerts';

const prismaMock = vi.hoisted(() => ({
  aiRequestLog: {
    create: vi.fn().mockResolvedValue({ id: 'test-id' }),
  },
  aiDailyStats: {
    groupBy: vi.fn().mockResolvedValue([]),
  },
  $executeRaw: vi.fn().mockResolvedValue(undefined),
}));

// Mock prisma
vi.mock('@/lib/db', () => ({
  prisma: prismaMock,
}));

// Mock costEstimation
vi.mock('@/lib/costEstimation', () => ({
  calculateTokenCost: vi.fn().mockReturnValue({
    inputCost: 0.001,
    outputCost: 0.002,
    totalCost: 0.003,
  }),
}));

vi.mock('@/lib/aiCostAlerts', () => ({
  maybeNotifyAiCostAlert: vi.fn().mockResolvedValue(undefined),
}));

const flushPromises = () => new Promise((resolve) => setImmediate(resolve));

describe('aiTelemetry', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prismaMock.$executeRaw.mockResolvedValue(undefined);
    prismaMock.aiDailyStats.groupBy.mockResolvedValue([]);
  });

  describe('createTelemetryContext', () => {
    it('creates context with all required fields', () => {
      const context = createTelemetryContext({
        userId: 'user-123',
        feature: 'tutor',
        model: 'gemini-2.0-flash',
        languagePair: 'pl-en',
      });

      expect(context.userId).toBe('user-123');
      expect(context.feature).toBe('tutor');
      expect(context.model).toBe('gemini-2.0-flash');
      expect(context.languagePair).toBe('pl-en');
      expect(context.startTime).toBeDefined();
      expect(typeof context.startTime).toBe('number');
    });

    it('allows optional sessionId', () => {
      const context = createTelemetryContext({
        userId: 'user-123',
        feature: 'tutor',
        model: 'gemini-2.0-flash',
        sessionId: 'session-456',
      });

      expect(context.sessionId).toBe('session-456');
    });
  });

  describe('getFeatureFromPath', () => {
    it('extracts feature from standard AI paths', () => {
      expect(getFeatureFromPath('/api/ai/tutor')).toBe('tutor');
      expect(getFeatureFromPath('/api/ai/generate-words')).toBe('generate-words');
      expect(getFeatureFromPath('/api/ai/pronunciation/evaluate')).toBe('pronunciation');
    });

    it('returns unknown for non-matching paths', () => {
      expect(getFeatureFromPath('/api/user/profile')).toBe('unknown');
      expect(getFeatureFromPath('/api/admin/stats')).toBe('unknown');
      expect(getFeatureFromPath('/other/path')).toBe('unknown');
    });
  });

  describe('logAiRequest', () => {
    it('calls prisma with correct data', async () => {
      await logAiRequest({
        userId: 'user-123',
        feature: 'tutor',
        model: 'gemini-2.0-flash',
        inputTokens: 100,
        outputTokens: 50,
        durationMs: 500,
        success: true,
      });

      expect(calculateTokenCost).toHaveBeenCalledWith('gemini-2.0-flash', 100, 50);
      expect(prisma.aiRequestLog.create).toHaveBeenCalled();
      expect(maybeNotifyAiCostAlert).toHaveBeenCalled();
    });

    it('includes optional fields when provided', async () => {
      await logAiRequest({
        userId: 'user-123',
        sessionId: 'session-456',
        feature: 'tutor',
        model: 'gemini-2.0-flash',
        languagePair: 'pl-en',
        inputTokens: 100,
        outputTokens: 50,
        durationMs: 500,
        success: true,
      });

      expect(prisma.aiRequestLog.create).toHaveBeenCalled();
      const createCall = vi.mocked(prisma.aiRequestLog.create).mock.calls[0][0];
      expect(createCall.data.sessionId).toBe('session-456');
      expect(createCall.data.languagePair).toBe('pl-en');
    });

    it('updates daily stats aggregates', async () => {
      await logAiRequest({
        userId: 'user-123',
        feature: 'tutor',
        model: 'gemini-2.0-flash',
        inputTokens: 100,
        outputTokens: 50,
        durationMs: 500,
        success: true,
      });

      await flushPromises();

      expect(prisma.$executeRaw).toHaveBeenCalledTimes(2);
      expect(prisma.aiDailyStats.groupBy).toHaveBeenCalledWith(
        expect.objectContaining({
          by: ['userId'],
          where: expect.objectContaining({
            feature: 'tutor',
            model: 'gemini-2.0-flash',
          }),
        })
      );
    });

    it('handles errors gracefully', async () => {
      vi.mocked(prisma.aiRequestLog.create).mockRejectedValueOnce(new Error('DB error'));

      // Should not throw
      await expect(logAiRequest({
        userId: 'user-123',
        feature: 'tutor',
        model: 'gemini-2.0-flash',
        inputTokens: 100,
        outputTokens: 50,
        durationMs: 500,
        success: true,
      })).resolves.toBeUndefined();
    });

    it('logs cost alert failures without throwing', async () => {
      const error = new Error('alert failed');
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      vi.mocked(maybeNotifyAiCostAlert).mockRejectedValueOnce(error);

      await logAiRequest({
        userId: 'user-123',
        feature: 'tutor',
        model: 'gemini-2.0-flash',
        inputTokens: 100,
        outputTokens: 50,
        durationMs: 500,
        success: true,
      });

      await flushPromises();

      expect(consoleSpy).toHaveBeenCalledWith('Failed to send AI cost alert:', error);
      consoleSpy.mockRestore();
    });

    it('truncates long error messages', async () => {
      const longMessage = 'a'.repeat(600);
      await logAiRequest({
        userId: 'user-123',
        feature: 'tutor',
        model: 'gemini-2.0-flash',
        inputTokens: 100,
        outputTokens: 50,
        durationMs: 500,
        success: false,
        errorMessage: longMessage,
      });

      const createCall = vi.mocked(prisma.aiRequestLog.create).mock.calls[0][0];
      expect(createCall.data.errorMessage?.length).toBeLessThanOrEqual(500);
    });
  });

  describe('logAiRequestError', () => {
    it('sets success to false', async () => {
      await logAiRequestError({
        userId: 'user-123',
        feature: 'tutor',
        model: 'gemini-2.0-flash',
        durationMs: 500,
        errorType: 'api_error',
        errorMessage: 'Something went wrong',
      });

      const createCall = vi.mocked(prisma.aiRequestLog.create).mock.calls[0][0];
      expect(createCall.data.success).toBe(false);
    });

    it('defaults token counts to zero', async () => {
      await logAiRequestError({
        userId: 'user-123',
        feature: 'tutor',
        model: 'gemini-2.0-flash',
        durationMs: 500,
        errorType: 'api_error',
      });

      expect(calculateTokenCost).toHaveBeenCalledWith('gemini-2.0-flash', 0, 0);
    });
  });

  describe('completeTelemetry', () => {
    it('calculates duration from context', async () => {
      const startTime = Date.now() - 500;
      const context = {
        userId: 'user-123',
        feature: 'tutor',
        model: 'gemini-2.0-flash',
        startTime,
      };

      await completeTelemetry(context, {
        inputTokens: 100,
        outputTokens: 50,
        success: true,
      });

      const createCall = vi.mocked(prisma.aiRequestLog.create).mock.calls[0][0];
      expect(createCall.data.durationMs).toBeGreaterThanOrEqual(500);
    });
  });
});
