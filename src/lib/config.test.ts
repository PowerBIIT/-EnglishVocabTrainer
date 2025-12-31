import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';

const prismaMock = {
  appConfig: {
    findMany: vi.fn(),
    findUnique: vi.fn(),
    upsert: vi.fn(),
    delete: vi.fn(),
  },
  configHistory: {
    findFirst: vi.fn(),
    create: vi.fn(),
  },
  $transaction: vi.fn(async (ops: Array<Promise<unknown>>) => Promise.all(ops)),
};

vi.mock('@/lib/db', () => ({
  prisma: prismaMock,
}));

const loadConfig = async () => {
  vi.resetModules();
  return import('@/lib/config');
};

describe('app config helpers', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    prismaMock.appConfig.findMany.mockReset();
    prismaMock.appConfig.findUnique.mockReset();
    prismaMock.appConfig.upsert.mockReset();
    prismaMock.appConfig.delete.mockReset();
    prismaMock.configHistory.findFirst.mockReset();
    prismaMock.configHistory.create.mockReset();
    prismaMock.$transaction.mockClear();
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it('reads config from database and caches it', async () => {
    prismaMock.appConfig.findMany.mockResolvedValue([{ key: 'FOO', value: 'bar' }]);
    prismaMock.configHistory.findFirst.mockResolvedValue(null);

    const { getAppConfig, invalidateConfigCache } = await loadConfig();

    await expect(getAppConfig('FOO')).resolves.toBe('bar');
    await expect(getAppConfig('FOO')).resolves.toBe('bar');
    const cachedCalls = prismaMock.appConfig.findMany.mock.calls.length;

    prismaMock.appConfig.findMany.mockResolvedValue([{ key: 'FOO', value: 'baz' }]);
    invalidateConfigCache();

    await expect(getAppConfig('FOO')).resolves.toBe('baz');
    expect(prismaMock.appConfig.findMany.mock.calls.length).toBe(cachedCalls + 1);
  });

  it('falls back to environment variables', async () => {
    prismaMock.appConfig.findMany.mockResolvedValue([]);
    prismaMock.configHistory.findFirst.mockResolvedValue(null);
    process.env.TEST_ENV_KEY = '  value  ';

    const { getAppConfig } = await loadConfig();
    await expect(getAppConfig('TEST_ENV_KEY')).resolves.toBe('value');
  });

  it('parses numeric config values', async () => {
    prismaMock.appConfig.findMany.mockResolvedValue([]);
    prismaMock.configHistory.findFirst.mockResolvedValue(null);

    process.env.NUMERIC_KEY = 'unlimited';
    const { getAppConfigNumber } = await loadConfig();
    await expect(getAppConfigNumber('NUMERIC_KEY', 5)).resolves.toBe(Number.POSITIVE_INFINITY);

    process.env.NUMERIC_KEY = 'not-a-number';
    await expect(getAppConfigNumber('NUMERIC_KEY', 5)).resolves.toBe(5);
  });

  it('updates config values and writes history', async () => {
    prismaMock.appConfig.findUnique.mockResolvedValue({ value: 'old' });
    prismaMock.appConfig.upsert.mockResolvedValue({});
    prismaMock.configHistory.create.mockResolvedValue({});

    const { setAppConfig } = await loadConfig();

    await setAppConfig({
      key: ' MAX_ACTIVE_USERS ',
      value: ' 123 ',
      updatedBy: 'tester',
      dataType: 'number',
    });

    expect(prismaMock.appConfig.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { key: 'MAX_ACTIVE_USERS' },
      })
    );
    expect(prismaMock.configHistory.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ oldValue: 'old', newValue: '123' }),
      })
    );
  });

  it('deletes config values when present', async () => {
    prismaMock.appConfig.findUnique.mockResolvedValueOnce(null);

    const { deleteAppConfig } = await loadConfig();
    await deleteAppConfig({ key: 'missing', updatedBy: 'tester' });

    expect(prismaMock.appConfig.delete).not.toHaveBeenCalled();

    prismaMock.appConfig.findUnique.mockResolvedValueOnce({ key: 'FOO', value: 'bar' });
    prismaMock.appConfig.delete.mockResolvedValue({});
    prismaMock.configHistory.create.mockResolvedValue({});

    await deleteAppConfig({ key: 'FOO', updatedBy: 'tester' });

    expect(prismaMock.appConfig.delete).toHaveBeenCalled();
    expect(prismaMock.configHistory.create).toHaveBeenCalled();
  });
});
