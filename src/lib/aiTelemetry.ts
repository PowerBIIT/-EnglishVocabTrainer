import { prisma } from '@/lib/db';
import { calculateTokenCost } from '@/lib/costEstimation';

export type AiRequestLogData = {
  userId: string;
  sessionId?: string;
  feature: string;
  model: string;
  languagePair?: string;
  inputTokens: number;
  outputTokens: number;
  durationMs: number;
  success: boolean;
  errorType?: string;
  errorMessage?: string;
};

/**
 * Log an AI request to the database (async, fire-and-forget pattern)
 * This function is designed to not block the main request flow
 */
export async function logAiRequest(data: AiRequestLogData): Promise<void> {
  try {
    const { inputCost, outputCost, totalCost } = calculateTokenCost(
      data.model,
      data.inputTokens,
      data.outputTokens
    );

    const totalTokens = data.inputTokens + data.outputTokens;

    // Insert individual request log
    await prisma.aiRequestLog.create({
      data: {
        userId: data.userId,
        sessionId: data.sessionId,
        feature: data.feature,
        model: data.model,
        languagePair: data.languagePair,
        inputTokens: data.inputTokens,
        outputTokens: data.outputTokens,
        totalTokens,
        inputCost,
        outputCost,
        totalCost,
        durationMs: data.durationMs,
        success: data.success,
        errorType: data.errorType,
        errorMessage: data.errorMessage?.slice(0, 500), // Limit error message length
      },
    });

    // Update daily stats (async, non-blocking)
    updateDailyStats(data, totalCost).catch((err) => {
      console.error('Failed to update daily stats:', err);
    });
  } catch (error) {
    // Log error but don't throw - telemetry should not break the main flow
    console.error('Failed to log AI request:', error);
  }
}

/**
 * Update daily aggregation stats
 */
async function updateDailyStats(data: AiRequestLogData, totalCost: number): Promise<void> {
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  const uniqueKey = {
    date: today,
    userId: data.userId,
    feature: data.feature,
    model: data.model,
  };

  // Upsert user daily stats
  await prisma.aiDailyStats.upsert({
    where: {
      date_userId_feature_model: uniqueKey,
    },
    create: {
      ...uniqueKey,
      languagePair: data.languagePair,
      requestCount: 1,
      successCount: data.success ? 1 : 0,
      errorCount: data.success ? 0 : 1,
      inputTokens: data.inputTokens,
      outputTokens: data.outputTokens,
      totalCost,
      avgDurationMs: data.durationMs,
      maxDurationMs: data.durationMs,
      minDurationMs: data.durationMs,
    },
    update: {
      requestCount: { increment: 1 },
      successCount: data.success ? { increment: 1 } : undefined,
      errorCount: data.success ? undefined : { increment: 1 },
      inputTokens: { increment: data.inputTokens },
      outputTokens: { increment: data.outputTokens },
      totalCost: { increment: totalCost },
      // For avg/max/min, we'll need to recalculate in the query
      // This is a simplified version - just update avgDurationMs
      avgDurationMs: data.durationMs, // Will be overwritten, not ideal but simple
    },
  });

  // Upsert global daily stats
  const globalKey = {
    date: today,
    feature: data.feature,
    model: data.model,
  };

  await prisma.aiGlobalDailyStats.upsert({
    where: {
      date_feature_model: globalKey,
    },
    create: {
      ...globalKey,
      requestCount: 1,
      successCount: data.success ? 1 : 0,
      errorCount: data.success ? 0 : 1,
      uniqueUsers: 1,
      inputTokens: data.inputTokens,
      outputTokens: data.outputTokens,
      totalCost,
      avgDurationMs: data.durationMs,
    },
    update: {
      requestCount: { increment: 1 },
      successCount: data.success ? { increment: 1 } : undefined,
      errorCount: data.success ? undefined : { increment: 1 },
      inputTokens: { increment: data.inputTokens },
      outputTokens: { increment: data.outputTokens },
      totalCost: { increment: totalCost },
      avgDurationMs: data.durationMs, // Simplified
    },
  });
}

/**
 * Log a failed AI request (convenience wrapper)
 */
export async function logAiRequestError(
  data: Omit<AiRequestLogData, 'success' | 'inputTokens' | 'outputTokens'> & {
    inputTokens?: number;
    outputTokens?: number;
    errorType: string;
    errorMessage?: string;
  }
): Promise<void> {
  return logAiRequest({
    ...data,
    inputTokens: data.inputTokens ?? 0,
    outputTokens: data.outputTokens ?? 0,
    success: false,
  });
}

/**
 * Get feature name from API path for consistent logging
 */
export function getFeatureFromPath(path: string): string {
  // Extract feature from paths like /api/ai/tutor, /api/ai/pronunciation/evaluate
  const match = path.match(/\/api\/ai\/([^/]+)/);
  if (match) {
    return match[1];
  }
  return 'unknown';
}

/**
 * Helper type for AI endpoint telemetry
 */
export type TelemetryContext = {
  userId: string;
  feature: string;
  model: string;
  languagePair?: string;
  sessionId?: string;
  startTime: number;
};

/**
 * Create a telemetry context for an AI request
 */
export function createTelemetryContext(params: {
  userId: string;
  feature: string;
  model: string;
  languagePair?: string;
  sessionId?: string;
}): TelemetryContext {
  return {
    ...params,
    startTime: Date.now(),
  };
}

/**
 * Complete telemetry logging with duration calculation
 */
export async function completeTelemetry(
  context: TelemetryContext,
  result: {
    inputTokens: number;
    outputTokens: number;
    success: boolean;
    errorType?: string;
    errorMessage?: string;
  }
): Promise<void> {
  const durationMs = Date.now() - context.startTime;

  return logAiRequest({
    userId: context.userId,
    sessionId: context.sessionId,
    feature: context.feature,
    model: context.model,
    languagePair: context.languagePair,
    inputTokens: result.inputTokens,
    outputTokens: result.outputTokens,
    durationMs,
    success: result.success,
    errorType: result.errorType,
    errorMessage: result.errorMessage,
  });
}
