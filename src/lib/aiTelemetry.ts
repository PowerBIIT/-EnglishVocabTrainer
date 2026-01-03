import { prisma } from '@/lib/db';
import { calculateTokenCost } from '@/lib/costEstimation';
import { maybeNotifyAiCostAlert } from '@/lib/aiCostAlerts';

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

    // Check cost alerts (async, non-blocking)
    maybeNotifyAiCostAlert().catch((err) => {
      console.error('Failed to send AI cost alert:', err);
    });
  } catch (error) {
    // Log error but don't throw - telemetry should not break the main flow
    console.error('Failed to log AI request:', error);
  }
}

/**
 * Update daily aggregation stats using raw SQL for proper aggregate calculations
 */
async function updateDailyStats(data: AiRequestLogData, totalCost: number): Promise<void> {
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  const successIncrement = data.success ? 1 : 0;
  const errorIncrement = data.success ? 0 : 1;

  // Upsert user daily stats with proper aggregate calculations
  await prisma.$executeRaw`
    INSERT INTO "AiDailyStats" (
      "id", "date", "userId", "feature", "model", "languagePair",
      "requestCount", "successCount", "errorCount",
      "inputTokens", "outputTokens", "totalCost",
      "avgDurationMs", "minDurationMs", "maxDurationMs",
      "createdAt", "updatedAt"
    ) VALUES (
      gen_random_uuid()::text,
      ${today}::date,
      ${data.userId},
      ${data.feature},
      ${data.model},
      ${data.languagePair ?? null},
      1,
      ${successIncrement},
      ${errorIncrement},
      ${data.inputTokens},
      ${data.outputTokens},
      ${totalCost},
      ${data.durationMs},
      ${data.durationMs},
      ${data.durationMs},
      NOW(),
      NOW()
    )
    ON CONFLICT ("date", "userId", "feature", "model")
    DO UPDATE SET
      "requestCount" = "AiDailyStats"."requestCount" + 1,
      "successCount" = "AiDailyStats"."successCount" + ${successIncrement},
      "errorCount" = "AiDailyStats"."errorCount" + ${errorIncrement},
      "inputTokens" = "AiDailyStats"."inputTokens" + ${data.inputTokens},
      "outputTokens" = "AiDailyStats"."outputTokens" + ${data.outputTokens},
      "totalCost" = "AiDailyStats"."totalCost" + ${totalCost},
      "avgDurationMs" = (("AiDailyStats"."avgDurationMs" * "AiDailyStats"."requestCount") + ${data.durationMs}) / ("AiDailyStats"."requestCount" + 1),
      "minDurationMs" = LEAST("AiDailyStats"."minDurationMs", ${data.durationMs}),
      "maxDurationMs" = GREATEST("AiDailyStats"."maxDurationMs", ${data.durationMs}),
      "updatedAt" = NOW()
  `;

  // Upsert global daily stats with proper aggregate calculations
  // First, count unique users for this date/feature/model combination
  const uniqueUsersResult = await prisma.aiDailyStats.groupBy({
    by: ['userId'],
    where: {
      date: today,
      feature: data.feature,
      model: data.model,
    },
  });
  const uniqueUsersCount = uniqueUsersResult.length;

  await prisma.$executeRaw`
    INSERT INTO "AiGlobalDailyStats" (
      "id", "date", "feature", "model",
      "requestCount", "successCount", "errorCount", "uniqueUsers",
      "inputTokens", "outputTokens", "totalCost", "avgDurationMs",
      "createdAt", "updatedAt"
    ) VALUES (
      gen_random_uuid()::text,
      ${today}::date,
      ${data.feature},
      ${data.model},
      1,
      ${successIncrement},
      ${errorIncrement},
      1,
      ${data.inputTokens},
      ${data.outputTokens},
      ${totalCost},
      ${data.durationMs},
      NOW(),
      NOW()
    )
    ON CONFLICT ("date", "feature", "model")
    DO UPDATE SET
      "requestCount" = "AiGlobalDailyStats"."requestCount" + 1,
      "successCount" = "AiGlobalDailyStats"."successCount" + ${successIncrement},
      "errorCount" = "AiGlobalDailyStats"."errorCount" + ${errorIncrement},
      "uniqueUsers" = ${uniqueUsersCount},
      "inputTokens" = "AiGlobalDailyStats"."inputTokens" + ${data.inputTokens},
      "outputTokens" = "AiGlobalDailyStats"."outputTokens" + ${data.outputTokens},
      "totalCost" = "AiGlobalDailyStats"."totalCost" + ${totalCost},
      "avgDurationMs" = (("AiGlobalDailyStats"."avgDurationMs" * "AiGlobalDailyStats"."requestCount") + ${data.durationMs}) / ("AiGlobalDailyStats"."requestCount" + 1),
      "updatedAt" = NOW()
  `;
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
