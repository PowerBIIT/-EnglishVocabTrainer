import { AccessStatus } from '@prisma/client';
import {
  checkAiUsageLimits,
  checkAndConsumeAiUsage,
  type UsageLimitResult,
} from '@/lib/aiUsage';
import { isAdminEmail } from '@/lib/access';
import { ensureUserPlan } from '@/lib/userPlan';
import {
  buildAiCostLimitPayload,
  checkAiCostLimit,
  type AiCostLimitStatus,
} from '@/lib/aiCostLimit';

export type AiAccessResult =
  | { ok: true }
  | {
      ok: false;
      status: number;
      body: {
        error: string;
        resetAt?: string;
        limit?: {
          maxRequests: number;
          maxUnits: number;
        };
        usage?: {
          count: number;
          units: number;
        };
        softLimit?: boolean;
        costLimit?: {
          limitUsd: number | null;
          usedUsd: number;
          remainingUsd: number | null;
          period: string;
          resetAt: string;
        };
      };
    };

const buildUsageError = (result: Exclude<UsageLimitResult, { ok: true }>): AiAccessResult => {
  return {
    ok: false,
    status: 429,
    body: {
      error: result.scope === 'global' ? 'global_limit_reached' : 'user_limit_reached',
      resetAt: result.resetAt,
      limit: result.limit,
      usage: result.usage,
      softLimit: result.scope === 'user',
    },
  };
};

const buildCostLimitError = (status: AiCostLimitStatus): AiAccessResult => {
  return {
    ok: false,
    status: 429,
    body: buildAiCostLimitPayload(status),
  };
};

export const ensureAiAccess = async ({
  userId,
  email,
}: {
  userId: string;
  email?: string | null;
}): Promise<AiAccessResult> => {
  const plan = await ensureUserPlan(userId, email ?? undefined);

  if (plan.accessStatus !== AccessStatus.ACTIVE) {
    return {
      ok: false,
      status: 403,
      body: {
        error: plan.accessStatus === AccessStatus.WAITLISTED ? 'waitlisted' : 'suspended',
      },
    };
  }

  const costLimit = await checkAiCostLimit();
  if (!costLimit.ok) {
    return buildCostLimitError(costLimit.status);
  }

  if (isAdminEmail(email ?? undefined)) {
    return { ok: true };
  }

  const usageResult = await checkAiUsageLimits({
    userId,
    plan: plan.plan,
  });

  if (!usageResult.ok) {
    return buildUsageError(usageResult);
  }

  return { ok: true };
};

export const enforceAiUsage = async ({
  userId,
  email,
  units,
  requests = 1,
}: {
  userId: string;
  email?: string | null;
  units: number;
  requests?: number;
}): Promise<AiAccessResult> => {
  const plan = await ensureUserPlan(userId, email ?? undefined);

  if (plan.accessStatus !== AccessStatus.ACTIVE) {
    return {
      ok: false,
      status: 403,
      body: {
        error: plan.accessStatus === AccessStatus.WAITLISTED ? 'waitlisted' : 'suspended',
      },
    };
  }

  const costLimit = await checkAiCostLimit();
  if (!costLimit.ok) {
    return buildCostLimitError(costLimit.status);
  }

  if (isAdminEmail(email ?? undefined)) {
    return { ok: true };
  }

  const usageResult = await checkAndConsumeAiUsage({
    userId,
    plan: plan.plan,
    units,
    requests,
  });

  if (!usageResult.ok) {
    return buildUsageError(usageResult);
  }

  return { ok: true };
};
