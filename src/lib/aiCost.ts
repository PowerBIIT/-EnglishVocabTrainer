import { prisma } from '@/lib/db';

export type AiCostWindow = {
  period: string;
  periodStart: Date;
  periodEnd: Date;
  day: number;
  daysInMonth: number;
};

export type AiCostTotals = AiCostWindow & {
  totalCost: number;
  projectedCost: number;
};

export const buildAiCostWindow = (date: Date = new Date()): AiCostWindow => {
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth();
  const period = date.toISOString().slice(0, 7);
  const periodStart = new Date(Date.UTC(year, month, 1, 0, 0, 0));
  const periodEnd = new Date(Date.UTC(year, month + 1, 1, 0, 0, 0));
  const day = Math.max(1, date.getUTCDate());
  const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  return { period, periodStart, periodEnd, day, daysInMonth };
};

export const getAiCostTotals = async (date: Date = new Date()): Promise<AiCostTotals> => {
  const window = buildAiCostWindow(date);

  const totals = await prisma.aiRequestLog.aggregate({
    where: {
      createdAt: {
        gte: window.periodStart,
        lt: window.periodEnd,
      },
    },
    _sum: {
      totalCost: true,
    },
  });

  const totalCost = totals._sum.totalCost ?? 0;
  const projectedCost =
    window.day > 0 ? (totalCost / window.day) * window.daysInMonth : totalCost;

  return {
    ...window,
    totalCost,
    projectedCost,
  };
};
