import { describe, expect, it, vi, beforeEach } from 'vitest';
import { getAppConfig } from '@/lib/config';
import {
  applyPromptOverlays,
  buildPromptWithOverlays,
  getAllPromptOverlays,
  getPromptOverlays,
} from '@/lib/aiPromptOverlay';

vi.mock('@/lib/config', () => ({
  getAppConfig: vi.fn(),
}));

describe('prompt overlays', () => {
  beforeEach(() => {
    vi.mocked(getAppConfig).mockReset();
  });

  it('normalizes global and prompt overlays', async () => {
    vi.mocked(getAppConfig)
      .mockResolvedValueOnce('  global note  ')
      .mockResolvedValueOnce(' prompt note ');

    const overlays = await getPromptOverlays('generate-words');
    expect(overlays).toEqual({
      global: 'global note',
      prompt: 'prompt note',
    });
  });

  it('returns overlays for all prompts', async () => {
    vi.mocked(getAppConfig).mockResolvedValue('');
    const overlays = await getAllPromptOverlays();

    expect(overlays.global).toBe('');
    expect(Object.keys(overlays.byPrompt).length).toBeGreaterThan(0);
  });

  it('inserts overlay block before the JSON marker', () => {
    const base = 'Intro\nRespond ONLY in JSON\n{}';
    const updated = applyPromptOverlays(base, { global: 'alpha', prompt: 'beta' });

    const index = updated.indexOf('Admin overlay');
    const markerIndex = updated.indexOf('Respond ONLY in JSON');
    expect(index).toBeGreaterThan(-1);
    expect(index).toBeLessThan(markerIndex);
  });

  it('appends overlay when marker is missing', () => {
    const base = 'Plain prompt';
    const updated = applyPromptOverlays(base, { global: 'alpha' });

    expect(updated).toContain('Admin overlay');
    expect(updated).toContain(base);
  });

  it('returns the base prompt when overlays are empty', () => {
    const base = 'Respond ONLY in JSON';
    expect(applyPromptOverlays(base, {})).toBe(base);
  });

  it('builds prompt with overlays', async () => {
    vi.mocked(getAppConfig)
      .mockResolvedValueOnce('global')
      .mockResolvedValueOnce('prompt');

    const result = await buildPromptWithOverlays('parse-text', 'Base\nRespond ONLY in JSON');
    expect(result).toContain('Admin overlay');
  });
});
