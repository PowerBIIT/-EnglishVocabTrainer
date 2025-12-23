import { prisma } from '@/lib/db';

export type ConfigValueType = 'number' | 'list' | 'string';

type ConfigCache = {
  data: Map<string, string>;
  timestamp: number;
};

const CACHE_TTL = 60_000;
let configCache: ConfigCache | null = null;

const normalizeKey = (key: string) => key.trim();

const loadConfigCache = async (): Promise<Map<string, string>> => {
  const now = Date.now();
  if (configCache && now - configCache.timestamp < CACHE_TTL) {
    return configCache.data;
  }

  const rows = await prisma.appConfig.findMany();
  const data = new Map(rows.map((row) => [row.key, row.value]));
  configCache = { data, timestamp: now };
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
  const normalized = value.trim().toLowerCase();
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
  const normalizedValue = value.trim();
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
