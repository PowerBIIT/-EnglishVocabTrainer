import { getAppConfigNumber } from '@/lib/config';
import { getAiCostTotals, type AiCostTotals } from '@/lib/aiCost';

export const AI_COST_HARD_LIMIT_KEY = 'AI_COST_HARD_LIMIT_USD';

export type AiCostLimitStatus = {
  enabled: boolean;
  limitUsd: number | null;
  usedUsd: number;
  remainingUsd: number | null;
  isExceeded: boolean;
  period: string;
  resetAt: string;
};

export type AiCostLimitPayload = {
  error: 'ai_cost_limit_reached';
  resetAt: string;
  costLimit: {
    limitUsd: number | null;
    usedUsd: number;
    remainingUsd: number | null;
    period: string;
    resetAt: string;
  };
};

export type AiCostLimitCheck =
  | { ok: true; status?: AiCostLimitStatus }
  | { ok: false; status: AiCostLimitStatus };

const normalizeLimit = (limit: number) =>
  Number.isFinite(limit) && limit > 0 ? limit : null;

export const buildAiCostLimitStatus = (
  totals: AiCostTotals,
  rawLimit: number
): AiCostLimitStatus => {
  const limit = normalizeLimit(rawLimit);
  const enabled = limit !== null;
  const isExceeded = enabled ? totals.totalCost >= limit : false;
  const remainingUsd = enabled ? Math.max(0, limit - totals.totalCost) : null;

  return {
    enabled,
    limitUsd: limit,
    usedUsd: totals.totalCost,
    remainingUsd,
    isExceeded,
    period: totals.period,
    resetAt: totals.periodEnd.toISOString(),
  };
};

export const buildAiCostLimitPayload = (
  status: AiCostLimitStatus
): AiCostLimitPayload => ({
  error: 'ai_cost_limit_reached',
  resetAt: status.resetAt,
  costLimit: {
    limitUsd: status.limitUsd,
    usedUsd: status.usedUsd,
    remainingUsd: status.remainingUsd,
    period: status.period,
    resetAt: status.resetAt,
  },
});

export const checkAiCostLimit = async (
  date: Date = new Date()
): Promise<AiCostLimitCheck> => {
  const rawLimit = await getAppConfigNumber(AI_COST_HARD_LIMIT_KEY, 0);
  const limit = normalizeLimit(rawLimit);

  if (!limit) {
    return { ok: true };
  }

  const totals = await getAiCostTotals(date);
  const status = buildAiCostLimitStatus(totals, rawLimit);

  if (status.isExceeded) {
    return { ok: false, status };
  }

  return { ok: true, status };
};
