import type { Plan } from '@prisma/client';

export type PlanLimits = {
  maxRequests: number;
  maxUnits: number;
};

const parseLimit = (value: string | undefined, fallback: number) => {
  if (!value) return fallback;
  const normalized = value.trim().toLowerCase();
  if (normalized === 'unlimited' || normalized === 'infinity' || normalized === 'inf' || normalized === '-1') {
    return Number.POSITIVE_INFINITY;
  }
  const parsed = Number(normalized);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return fallback;
  }
  return Math.floor(parsed);
};

const DEFAULT_FREE_LIMITS: PlanLimits = {
  maxRequests: 60,
  maxUnits: 120_000,
};

const DEFAULT_PRO_LIMITS: PlanLimits = {
  maxRequests: 600,
  maxUnits: 1_200_000,
};

const DEFAULT_GLOBAL_LIMITS: PlanLimits = {
  maxRequests: 6_000,
  maxUnits: 12_000_000,
};

export const getPlanLimits = (plan: Plan): PlanLimits => {
  if (plan === 'PRO') {
    return {
      maxRequests: parseLimit(
        process.env.PRO_AI_REQUESTS_PER_MONTH,
        DEFAULT_PRO_LIMITS.maxRequests
      ),
      maxUnits: parseLimit(
        process.env.PRO_AI_UNITS_PER_MONTH,
        DEFAULT_PRO_LIMITS.maxUnits
      ),
    };
  }

  return {
    maxRequests: parseLimit(
      process.env.FREE_AI_REQUESTS_PER_MONTH,
      DEFAULT_FREE_LIMITS.maxRequests
    ),
    maxUnits: parseLimit(
      process.env.FREE_AI_UNITS_PER_MONTH,
      DEFAULT_FREE_LIMITS.maxUnits
    ),
  };
};

export const getGlobalLimits = (): PlanLimits => ({
  maxRequests: parseLimit(
    process.env.GLOBAL_AI_REQUESTS_PER_MONTH,
    DEFAULT_GLOBAL_LIMITS.maxRequests
  ),
  maxUnits: parseLimit(
    process.env.GLOBAL_AI_UNITS_PER_MONTH,
    DEFAULT_GLOBAL_LIMITS.maxUnits
  ),
});
