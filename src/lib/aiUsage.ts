import type { Plan } from '@prisma/client';
import { prisma } from '@/lib/db';
import { getGlobalLimits, getPlanLimits, type PlanLimits } from '@/lib/plans';

const AI_FEATURE = 'ai';

export type UsageSnapshot = {
  count: number;
  units: number;
};

export type UsageScope = 'user' | 'global';

export type UsageLimitResult =
  | { ok: true }
  | {
      ok: false;
      scope: UsageScope;
      limit: PlanLimits;
      usage: UsageSnapshot;
      resetAt: string;
    };

export const getCurrentPeriod = (date: Date = new Date()) =>
  date.toISOString().slice(0, 7);

export const getNextPeriodResetAt = (date: Date = new Date()) => {
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth();
  const resetAt = new Date(Date.UTC(year, month + 1, 1, 0, 0, 0));
  return resetAt.toISOString();
};

export const checkAndConsumeAiUsage = async ({
  userId,
  plan,
  units,
  requests = 1,
}: {
  userId: string;
  plan: Plan;
  units: number;
  requests?: number;
}): Promise<UsageLimitResult> => {
  const safeRequests = Math.max(1, Math.round(requests));
  const safeUnits = Math.max(1, Math.round(units));
  const period = getCurrentPeriod();

  const [userUsage, globalUsage] = await prisma.$transaction([
    prisma.usageCounter.findUnique({
      where: {
        userId_period_feature: {
          userId,
          period,
          feature: AI_FEATURE,
        },
      },
    }),
    prisma.globalUsage.findUnique({
      where: {
        period_feature: {
          period,
          feature: AI_FEATURE,
        },
      },
    }),
  ]);

  const planLimits = getPlanLimits(plan);
  const globalLimits = getGlobalLimits();

  const nextUserUsage: UsageSnapshot = {
    count: (userUsage?.count ?? 0) + safeRequests,
    units: (userUsage?.units ?? 0) + safeUnits,
  };
  const nextGlobalUsage: UsageSnapshot = {
    count: (globalUsage?.count ?? 0) + safeRequests,
    units: (globalUsage?.units ?? 0) + safeUnits,
  };

  const resetAt = getNextPeriodResetAt();

  if (
    (globalLimits.maxRequests !== Number.POSITIVE_INFINITY &&
      nextGlobalUsage.count > globalLimits.maxRequests) ||
    (globalLimits.maxUnits !== Number.POSITIVE_INFINITY &&
      nextGlobalUsage.units > globalLimits.maxUnits)
  ) {
    return {
      ok: false,
      scope: 'global',
      limit: globalLimits,
      usage: nextGlobalUsage,
      resetAt,
    };
  }

  if (
    (planLimits.maxRequests !== Number.POSITIVE_INFINITY &&
      nextUserUsage.count > planLimits.maxRequests) ||
    (planLimits.maxUnits !== Number.POSITIVE_INFINITY &&
      nextUserUsage.units > planLimits.maxUnits)
  ) {
    return {
      ok: false,
      scope: 'user',
      limit: planLimits,
      usage: nextUserUsage,
      resetAt,
    };
  }

  await prisma.$transaction([
    prisma.usageCounter.upsert({
      where: {
        userId_period_feature: {
          userId,
          period,
          feature: AI_FEATURE,
        },
      },
      create: {
        userId,
        period,
        feature: AI_FEATURE,
        count: safeRequests,
        units: safeUnits,
      },
      update: {
        count: { increment: safeRequests },
        units: { increment: safeUnits },
      },
    }),
    prisma.globalUsage.upsert({
      where: {
        period_feature: {
          period,
          feature: AI_FEATURE,
        },
      },
      create: {
        period,
        feature: AI_FEATURE,
        count: safeRequests,
        units: safeUnits,
      },
      update: {
        count: { increment: safeRequests },
        units: { increment: safeUnits },
      },
    }),
  ]);

  return { ok: true };
};
