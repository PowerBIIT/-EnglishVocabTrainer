import { prisma } from '@/lib/db';

type RateLimitOptions = {
  limit: number;
  windowMs: number;
};

type RateLimitEntry = {
  count: number;
  resetAt: number;
};

type RateLimitResult =
  | { ok: true }
  | {
      ok: false;
      retryAfter: number;
    };

type RateLimitGlobal = typeof globalThis & {
  rateLimitStore?: Map<string, RateLimitEntry>;
  rateLimitCleanupAt?: number;
};

const globalForRateLimit = globalThis as RateLimitGlobal;
const rateLimitStore = globalForRateLimit.rateLimitStore ?? new Map<string, RateLimitEntry>();
globalForRateLimit.rateLimitStore = rateLimitStore;
globalForRateLimit.rateLimitCleanupAt = globalForRateLimit.rateLimitCleanupAt ?? 0;

const MAX_MEMORY_WINDOWS = 4;
const MEMORY_WINDOW_LEEWAY_MS = 5_000;
const RATE_LIMIT_CLEANUP_INTERVAL_MS = 5 * 60 * 1000;

const truncateRetryAfter = (resetAt: number) => Math.max(1, Math.ceil((resetAt - Date.now()) / 1000));

const getWindowBounds = (windowMs: number) => {
  const now = Date.now();
  const windowStart = now - (now % windowMs);
  const resetAt = windowStart + windowMs;
  return { now, windowStart, resetAt };
};

const cleanupMemoryStore = (windowMs: number) => {
  const now = Date.now();
  const latestAllowed = now - windowMs * MAX_MEMORY_WINDOWS - MEMORY_WINDOW_LEEWAY_MS;
  for (const [key, entry] of rateLimitStore.entries()) {
    if (entry.resetAt < latestAllowed) {
      rateLimitStore.delete(key);
    }
  }
};

const fallbackMemoryLimiter = (key: string, options: RateLimitOptions): RateLimitResult => {
  cleanupMemoryStore(options.windowMs);
  const { resetAt } = getWindowBounds(options.windowMs);
  const entry = rateLimitStore.get(key);

  if (!entry || entry.resetAt <= Date.now()) {
    rateLimitStore.set(key, { count: 1, resetAt });
    return { ok: true };
  }

  if (entry.count >= options.limit) {
    return {
      ok: false,
      retryAfter: truncateRetryAfter(entry.resetAt),
    };
  }

  entry.count += 1;
  rateLimitStore.set(key, entry);
  return { ok: true };
};

const maybeCleanupDatabaseWindows = async (windowMs: number) => {
  const now = Date.now();
  if (globalForRateLimit.rateLimitCleanupAt && now - globalForRateLimit.rateLimitCleanupAt < RATE_LIMIT_CLEANUP_INTERVAL_MS) {
    return;
  }

  globalForRateLimit.rateLimitCleanupAt = now;
  const cutoff = new Date(now - windowMs * MAX_MEMORY_WINDOWS);

  await prisma.rateLimitWindow.deleteMany({
    where: { resetAt: { lt: cutoff } },
  });
};

export const checkRateLimit = async (
  key: string,
  options: RateLimitOptions
): Promise<RateLimitResult> => {
  const { windowStart, resetAt } = getWindowBounds(options.windowMs);
  const windowStartDate = new Date(windowStart);
  const resetAtDate = new Date(resetAt);

  try {
    const result = await prisma.rateLimitWindow.upsert({
      where: {
        key_windowStart: {
          key,
          windowStart: windowStartDate,
        },
      },
      create: {
        key,
        windowStart: windowStartDate,
        resetAt: resetAtDate,
        count: 1,
      },
      update: {
        count: { increment: 1 },
        resetAt: resetAtDate,
      },
      select: {
        count: true,
        resetAt: true,
      },
    });

    void maybeCleanupDatabaseWindows(options.windowMs).catch(() => {});

    if (result.count > options.limit) {
      return {
        ok: false,
        retryAfter: truncateRetryAfter(result.resetAt.getTime()),
      };
    }

    return { ok: true };
  } catch (error) {
    console.error('Database rate limit failed, using in-memory fallback', error);
    return fallbackMemoryLimiter(key, options);
  }
};
