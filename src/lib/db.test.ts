import { describe, expect, it, afterEach, vi } from 'vitest';

const prismaCtor = vi.fn(function PrismaClientMock(this: { tag?: string }) {
  this.tag = 'prisma';
});

vi.mock('@prisma/client', () => ({
  PrismaClient: prismaCtor,
}));

const loadDb = async (env: string) => {
  process.env.NODE_ENV = env;
  vi.resetModules();
  return import('@/lib/db');
};

describe('prisma client', () => {
  const originalEnv = process.env.NODE_ENV;

  afterEach(() => {
    process.env.NODE_ENV = originalEnv;
    delete (globalThis as { prisma?: unknown }).prisma;
  });

  it('reuses a global client in development', async () => {
    const first = await loadDb('development');
    const second = await loadDb('development');

    expect(prismaCtor).toHaveBeenCalled();
    expect(first.prisma).toBe(second.prisma);
    expect((globalThis as { prisma?: unknown }).prisma).toBe(first.prisma);
  });

  it('does not set global in production', async () => {
    await loadDb('production');

    expect((globalThis as { prisma?: unknown }).prisma).toBeUndefined();
  });
});
