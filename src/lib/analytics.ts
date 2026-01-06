import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db';

export type AnalyticsEventData = {
  userId: string;
  eventName: string;
  feature?: string;
  source?: string;
  metadata?: Record<string, unknown>;
};

const ANALYTICS_RETENTION_DAYS = 365;
const ANALYTICS_PRUNE_INTERVAL_MS = 24 * 60 * 60 * 1000;
const MAX_METADATA_BYTES = 4096;
let lastAnalyticsPruneAt: number | null = null;

const normalizeDate = (date: Date) =>
  new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));

const sanitizeLabel = (value?: string) => value?.trim().slice(0, 64) ?? '';

const sanitizeMetadata = (metadata?: Record<string, unknown>) => {
  if (!metadata) return undefined;
  try {
    const raw = JSON.stringify(metadata);
    if (raw.length <= MAX_METADATA_BYTES) {
      return metadata;
    }
  } catch {
    return { truncated: true };
  }
  return { truncated: true };
};

const maybePruneAnalytics = async () => {
  const now = Date.now();
  if (lastAnalyticsPruneAt && now - lastAnalyticsPruneAt < ANALYTICS_PRUNE_INTERVAL_MS) {
    return;
  }
  lastAnalyticsPruneAt = now;
  const cutoff = new Date(now - ANALYTICS_RETENTION_DAYS * 24 * 60 * 60 * 1000);
  const cutoffDate = normalizeDate(cutoff);

  await prisma.$transaction([
    prisma.analyticsEvent.deleteMany({
      where: {
        createdAt: {
          lt: cutoff,
        },
      },
    }),
    prisma.analyticsDailyStat.deleteMany({
      where: {
        date: {
          lt: cutoffDate,
        },
      },
    }),
  ]);
};

export async function logAnalyticsEvent(data: AnalyticsEventData): Promise<void> {
  try {
    const now = new Date();
    const date = normalizeDate(now);
    const eventName = sanitizeLabel(data.eventName).toLowerCase();
    const feature = sanitizeLabel(data.feature).toLowerCase();
    const source = sanitizeLabel(data.source).toLowerCase();
    const metadata = sanitizeMetadata(data.metadata);

    if (!eventName) return;

    await prisma.analyticsEvent.create({
      data: {
        userId: data.userId,
        eventName,
        feature,
        source,
        metadata: metadata as Prisma.InputJsonValue | undefined,
      },
    });

    await prisma.analyticsDailyStat.upsert({
      where: {
        date_eventName_feature_source: {
          date,
          eventName,
          feature,
          source,
        },
      },
      create: {
        date,
        eventName,
        feature,
        source,
        count: 1,
      },
      update: {
        count: { increment: 1 },
      },
    });

    maybePruneAnalytics().catch((error) => {
      console.error('Failed to prune analytics data:', error);
    });
  } catch (error) {
    console.error('Failed to log analytics event:', error);
  }
}

export const ANALYTICS_LIMITS = {
  retentionDays: ANALYTICS_RETENTION_DAYS,
};
