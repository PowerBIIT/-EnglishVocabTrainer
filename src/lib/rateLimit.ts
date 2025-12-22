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
};

const globalForRateLimit = globalThis as RateLimitGlobal;
const rateLimitStore =
  globalForRateLimit.rateLimitStore ?? new Map<string, RateLimitEntry>();
globalForRateLimit.rateLimitStore = rateLimitStore;

export const checkRateLimit = (
  key: string,
  options: RateLimitOptions
): RateLimitResult => {
  const now = Date.now();
  const entry = rateLimitStore.get(key);

  if (!entry || entry.resetAt <= now) {
    rateLimitStore.set(key, { count: 1, resetAt: now + options.windowMs });
    return { ok: true };
  }

  if (entry.count >= options.limit) {
    return {
      ok: false,
      retryAfter: Math.ceil((entry.resetAt - now) / 1000),
    };
  }

  entry.count += 1;
  rateLimitStore.set(key, entry);
  return { ok: true };
};
