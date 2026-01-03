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

export type UsageState = {
  user: UsageSnapshot;
  global: UsageSnapshot;
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

const buildSnapshot = (record: { count: number; units: number } | null): UsageSnapshot => ({
  count: record?.count ?? 0,
  units: record?.units ?? 0,
});

export const getCurrentAiUsage = async (userId: string): Promise<UsageState> => {
  const period = getCurrentPeriod();
  const resetAt = getNextPeriodResetAt();

  const [userUsage, globalUsage] = await prisma.$transaction([
    prisma.usageCounter.findUnique({
      where: {
        userId_period_feature: {
          userId,
          period,
          feature: AI_FEATURE,
        },
      },
      select: { count: true, units: true },
    }),
    prisma.globalUsage.findUnique({
      where: {
        period_feature: {
          period,
          feature: AI_FEATURE,
        },
      },
      select: { count: true, units: true },
    }),
  ]);

  return {
    user: buildSnapshot(userUsage),
    global: buildSnapshot(globalUsage),
    resetAt,
  };
};

export const checkAiUsageLimits = async ({
  userId,
  plan,
}: {
  userId: string;
  plan: Plan;
}): Promise<UsageLimitResult> => {
  const usageState = await getCurrentAiUsage(userId);
  const planLimits = await getPlanLimits(plan);
  const globalLimits = await getGlobalLimits();

  if (
    (globalLimits.maxRequests !== Number.POSITIVE_INFINITY &&
      usageState.global.count >= globalLimits.maxRequests) ||
    (globalLimits.maxUnits !== Number.POSITIVE_INFINITY &&
      usageState.global.units >= globalLimits.maxUnits)
  ) {
    return {
      ok: false,
      scope: 'global',
      limit: globalLimits,
      usage: usageState.global,
      resetAt: usageState.resetAt,
    };
  }

  if (
    (planLimits.maxRequests !== Number.POSITIVE_INFINITY &&
      usageState.user.count >= planLimits.maxRequests) ||
    (planLimits.maxUnits !== Number.POSITIVE_INFINITY &&
      usageState.user.units >= planLimits.maxUnits)
  ) {
    return {
      ok: false,
      scope: 'user',
      limit: planLimits,
      usage: usageState.user,
      resetAt: usageState.resetAt,
    };
  }

  return { ok: true };
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
  const resetAt = getNextPeriodResetAt();

  const planLimits = await getPlanLimits(plan);
  const globalLimits = await getGlobalLimits();

  // ATOMIC: Increment first, then check limits within transaction
  // This prevents race conditions where parallel requests pass limit check
  const result = await prisma.$transaction(async (tx) => {
    // Atomically increment user usage
    const userUsage = await tx.usageCounter.upsert({
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
    });

    // Atomically increment global usage
    const globalUsage = await tx.globalUsage.upsert({
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
    });

    const userSnapshot: UsageSnapshot = {
      count: userUsage.count,
      units: userUsage.units,
    };
    const globalSnapshot: UsageSnapshot = {
      count: globalUsage.count,
      units: globalUsage.units,
    };

    // Check global limits (after increment)
    if (
      (globalLimits.maxRequests !== Number.POSITIVE_INFINITY &&
        globalSnapshot.count > globalLimits.maxRequests) ||
      (globalLimits.maxUnits !== Number.POSITIVE_INFINITY &&
        globalSnapshot.units > globalLimits.maxUnits)
    ) {
      // Rollback by decrementing
      await tx.usageCounter.update({
        where: {
          userId_period_feature: { userId, period, feature: AI_FEATURE },
        },
        data: {
          count: { decrement: safeRequests },
          units: { decrement: safeUnits },
        },
      });
      await tx.globalUsage.update({
        where: { period_feature: { period, feature: AI_FEATURE } },
        data: {
          count: { decrement: safeRequests },
          units: { decrement: safeUnits },
        },
      });

      return {
        ok: false as const,
        scope: 'global' as const,
        limit: globalLimits,
        usage: globalSnapshot,
        resetAt,
      };
    }

    // Check user limits (after increment)
    if (
      (planLimits.maxRequests !== Number.POSITIVE_INFINITY &&
        userSnapshot.count > planLimits.maxRequests) ||
      (planLimits.maxUnits !== Number.POSITIVE_INFINITY &&
        userSnapshot.units > planLimits.maxUnits)
    ) {
      // Rollback by decrementing
      await tx.usageCounter.update({
        where: {
          userId_period_feature: { userId, period, feature: AI_FEATURE },
        },
        data: {
          count: { decrement: safeRequests },
          units: { decrement: safeUnits },
        },
      });
      await tx.globalUsage.update({
        where: { period_feature: { period, feature: AI_FEATURE } },
        data: {
          count: { decrement: safeRequests },
          units: { decrement: safeUnits },
        },
      });

      return {
        ok: false as const,
        scope: 'user' as const,
        limit: planLimits,
        usage: userSnapshot,
        resetAt,
      };
    }

    return { ok: true as const };
  });

  return result;
};

export const recordAiUsage = async ({
  userId,
  units,
  requests = 1,
}: {
  userId: string;
  units: number;
  requests?: number;
}): Promise<UsageState> => {
  const safeRequests = Math.max(1, Math.round(requests));
  const safeUnits = Math.max(0, Math.round(units));
  const period = getCurrentPeriod();
  const resetAt = getNextPeriodResetAt();

  const result = await prisma.$transaction(async (tx) => {
    const userUsage = await tx.usageCounter.upsert({
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
    });

    const globalUsage = await tx.globalUsage.upsert({
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
    });

    return {
      user: buildSnapshot(userUsage),
      global: buildSnapshot(globalUsage),
    };
  });

  return {
    ...result,
    resetAt,
  };
};
