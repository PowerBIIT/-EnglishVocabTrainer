import type { Plan } from '@prisma/client';
import { getAppConfigNumber } from '@/lib/config';
import {
  DEFAULT_FREE_LIMITS,
  DEFAULT_GLOBAL_LIMITS,
  DEFAULT_PRO_LIMITS,
} from '@/lib/configDefaults';

export type PlanLimits = {
  maxRequests: number;
  maxUnits: number;
};

export const getPlanLimits = async (plan: Plan): Promise<PlanLimits> => {
  if (plan === 'PRO') {
    return {
      maxRequests: await getAppConfigNumber(
        'PRO_AI_REQUESTS_PER_MONTH',
        DEFAULT_PRO_LIMITS.maxRequests
      ),
      maxUnits: await getAppConfigNumber(
        'PRO_AI_UNITS_PER_MONTH',
        DEFAULT_PRO_LIMITS.maxUnits
      ),
    };
  }

  return {
    maxRequests: await getAppConfigNumber(
      'FREE_AI_REQUESTS_PER_MONTH',
      DEFAULT_FREE_LIMITS.maxRequests
    ),
    maxUnits: await getAppConfigNumber(
      'FREE_AI_UNITS_PER_MONTH',
      DEFAULT_FREE_LIMITS.maxUnits
    ),
  };
};

export const getGlobalLimits = async (): Promise<PlanLimits> => ({
  maxRequests: await getAppConfigNumber(
    'GLOBAL_AI_REQUESTS_PER_MONTH',
    DEFAULT_GLOBAL_LIMITS.maxRequests
  ),
  maxUnits: await getAppConfigNumber(
    'GLOBAL_AI_UNITS_PER_MONTH',
    DEFAULT_GLOBAL_LIMITS.maxUnits
  ),
});
