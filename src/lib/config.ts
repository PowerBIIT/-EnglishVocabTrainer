import { prisma } from '@/lib/db';

export type ConfigValueType = 'number' | 'list' | 'string';

type ConfigCache = {
  data: Map<string, string>;
  timestamp: number;
  lastChangedAt: string | null;
};

const parseCacheTtl = () => {
  const raw = process.env.CONFIG_CACHE_TTL_MS ?? '';
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return 5_000;
  }
  return Math.min(60_000, Math.floor(parsed));
};

const CACHE_TTL = parseCacheTtl();
let configCache: ConfigCache | null = null;

const normalizeKey = (key: string) => key.trim();

const getLatestChangeTimestamp = async () => {
  const latestChange = await prisma.configHistory.findFirst({
    orderBy: { changedAt: 'desc' },
    select: { changedAt: true },
  });
  return latestChange?.changedAt ?? null;
};

const shouldUseCache = (now: number, latestChange: Date | null) => {
  if (!configCache) return false;
  const cacheAge = now - configCache.timestamp;
  if (cacheAge >= CACHE_TTL) return false;
  if (!latestChange && !configCache.lastChangedAt) return true;
  if (!latestChange || !configCache.lastChangedAt) return false;
  return latestChange.getTime() <= new Date(configCache.lastChangedAt).getTime();
};

const loadConfigCache = async (): Promise<Map<string, string>> => {
  const now = Date.now();
  const latestChange = await getLatestChangeTimestamp();

  if (shouldUseCache(now, latestChange)) {
    return configCache!.data;
  }

  const [rows, latest] = await prisma.$transaction([
    prisma.appConfig.findMany(),
    prisma.configHistory.findFirst({
      orderBy: { changedAt: 'desc' },
      select: { changedAt: true },
    }),
  ]);
  const data = new Map(rows.map((row) => [row.key, row.value]));
  configCache = {
    data,
    timestamp: now,
    lastChangedAt: latest?.changedAt?.toISOString() ?? latestChange?.toISOString() ?? null,
  };

  return data;
};

export const invalidateConfigCache = () => {
  configCache = null;
};

export const getAllAppConfig = async () => {
  return loadConfigCache();
};

const readEnvValue = (key: string) => {
  const value = process.env[key];
  if (!value) return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

export const getAppConfig = async (key: string) => {
  const normalizedKey = normalizeKey(key);
  const data = await loadConfigCache();
  if (data.has(normalizedKey)) {
    return data.get(normalizedKey) ?? null;
  }

  const envValue = readEnvValue(normalizedKey);
  if (envValue !== null) {
    return envValue;
  }

  return null;
};

const parseNumericConfig = (value: string | null, fallback: number) => {
  if (!value) return fallback;
  // Remove surrounding quotes if present (e.g., "1" -> 1)
  let normalized = value.trim().toLowerCase();
  if ((normalized.startsWith('"') && normalized.endsWith('"')) ||
      (normalized.startsWith("'") && normalized.endsWith("'"))) {
    normalized = normalized.slice(1, -1).trim();
  }
  if (!normalized) return fallback;
  if (['unlimited', 'infinity', 'inf', '-1'].includes(normalized)) {
    return Number.POSITIVE_INFINITY;
  }
  const parsed = Number(normalized);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return fallback;
  }
  return Math.floor(parsed);
};

export const getAppConfigNumber = async (key: string, fallback: number) => {
  const value = await getAppConfig(key);
  return parseNumericConfig(value, fallback);
};

const sanitizeConfigValue = (value: string, dataType: ConfigValueType): string => {
  let sanitized = value.trim();

  // Remove surrounding quotes for all types
  if ((sanitized.startsWith('"') && sanitized.endsWith('"')) ||
      (sanitized.startsWith("'") && sanitized.endsWith("'"))) {
    sanitized = sanitized.slice(1, -1).trim();
  }

  // Additional validation for number type
  if (dataType === 'number') {
    const lower = sanitized.toLowerCase();
    // Allow special values
    if (['unlimited', 'infinity', 'inf', '-1', ''].includes(lower)) {
      return sanitized;
    }
    // Validate it's a valid number
    const num = Number(sanitized);
    if (!Number.isFinite(num)) {
      throw new Error(`Invalid number value: ${value}`);
    }
  }

  return sanitized;
};

export const setAppConfig = async ({
  key,
  value,
  updatedBy,
  dataType = 'number',
}: {
  key: string;
  value: string;
  updatedBy: string;
  dataType?: ConfigValueType;
}) => {
  const normalizedKey = normalizeKey(key);
  const normalizedValue = sanitizeConfigValue(value, dataType);
  const existing = await prisma.appConfig.findUnique({ where: { key: normalizedKey } });
  const oldValue = existing?.value ?? null;

  await prisma.$transaction([
    prisma.appConfig.upsert({
      where: { key: normalizedKey },
      create: {
        key: normalizedKey,
        value: normalizedValue,
        dataType,
        updatedBy,
      },
      update: {
        value: normalizedValue,
        dataType,
        updatedBy,
      },
    }),
    prisma.configHistory.create({
      data: {
        configKey: normalizedKey,
        oldValue,
        newValue: normalizedValue,
        changedBy: updatedBy,
      },
    }),
  ]);

  invalidateConfigCache();
};

export const deleteAppConfig = async ({
  key,
  updatedBy,
}: {
  key: string;
  updatedBy: string;
}) => {
  const normalizedKey = normalizeKey(key);
  const existing = await prisma.appConfig.findUnique({ where: { key: normalizedKey } });
  if (!existing) {
    return;
  }

  await prisma.$transaction([
    prisma.appConfig.delete({ where: { key: normalizedKey } }),
    prisma.configHistory.create({
      data: {
        configKey: normalizedKey,
        oldValue: existing.value,
        newValue: '',
        changedBy: updatedBy,
      },
    }),
  ]);

  invalidateConfigCache();
};
