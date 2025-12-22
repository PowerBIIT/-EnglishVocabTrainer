import { AccessStatus } from '@prisma/client';
import { checkAndConsumeAiUsage, type UsageLimitResult } from '@/lib/aiUsage';
import { ensureUserPlan } from '@/lib/userPlan';

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
