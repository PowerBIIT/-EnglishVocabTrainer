import { describe, expect, it, vi, beforeEach } from 'vitest';
import { getAppConfig } from '@/lib/config';
import { DEFAULT_GEMINI_MODEL } from '@/lib/aiModelCatalog';
import { resolveGeminiModel } from '@/lib/aiModelResolver';

vi.mock('@/lib/config', () => ({
  getAppConfig: vi.fn(),
}));

describe('resolveGeminiModel', () => {
  beforeEach(() => {
    vi.mocked(getAppConfig).mockReset();
  });

  it('uses configured model when present', async () => {
    vi.mocked(getAppConfig).mockResolvedValue('  gemini-2.5-flash  ');
    await expect(resolveGeminiModel()).resolves.toBe('gemini-2.5-flash');
  });

  it('normalizes model ids to lowercase', async () => {
    vi.mocked(getAppConfig).mockResolvedValue('  GEMINI-2.5-FLASH  ');
    await expect(resolveGeminiModel()).resolves.toBe('gemini-2.5-flash');
  });

  it('falls back to the default when config empty', async () => {
    vi.mocked(getAppConfig).mockResolvedValue('');
    await expect(resolveGeminiModel()).resolves.toBe(DEFAULT_GEMINI_MODEL);
  });

  it('falls back to the default when config is unknown', async () => {
    vi.mocked(getAppConfig).mockResolvedValue('unknown-model');
    await expect(resolveGeminiModel()).resolves.toBe(DEFAULT_GEMINI_MODEL);
  });
});
