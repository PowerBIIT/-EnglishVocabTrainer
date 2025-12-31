import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';
import {
  applyMissionReward,
  createDailyMission,
  defaultSettings,
  defaultStats,
  ensureDailyMission,
  hydrateAppState,
} from '@/lib/appState';
import type { AppState } from '@/lib/appState';

describe('hydrateAppState', () => {
  const originalDateNow = Date.now;
  const originalMathRandom = Math.random;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-01-05T12:00:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
    Date.now = originalDateNow;
    Math.random = originalMathRandom;
  });

  it('hydrates set metadata and setIds defaults', () => {
    const raw: AppState = {
      vocabulary: [
        {
          id: 'v1',
          en: 'apple',
          phonetic: '/apple/',
          pl: 'jablko',
          category: 'Test',
          difficulty: 'easy',
          created_at: new Date().toISOString() as unknown as Date,
          source: 'manual',
          languagePair: 'pl-en',
        },
      ],
      sets: [
        {
          id: 'set-1',
          name: 'Klasowka',
          createdAt: new Date().toISOString() as unknown as Date,
          languagePair: 'pl-en',
        },
      ],
      progress: {},
      settings: defaultSettings,
      stats: defaultStats,
      dailyMission: createDailyMission(new Date('2024-01-01')),
    };

    const hydrated = hydrateAppState(raw);

    expect(hydrated.vocabulary[0].setIds).toEqual([]);
    expect(hydrated.sets[0].createdAt).toBeInstanceOf(Date);
  });

  it('normalizes settings and mission defaults', () => {
    const raw: AppState = {
      vocabulary: [],
      sets: [],
      progress: {},
      settings: {
        ...defaultSettings,
        general: { ...defaultSettings.general, language: 'es' as never },
        ai: { ...defaultSettings.ai, feedbackLanguage: 'xx' as never },
        learning: { ...defaultSettings.learning, pairId: 'unknown' as never },
      },
      stats: defaultStats,
      dailyMission: createDailyMission(new Date('2024-01-01')),
    };

    const hydrated = hydrateAppState(raw);

    expect(hydrated.settings.learning.pairId).toBe('pl-en');
    expect(hydrated.settings.general.language).toBe('pl');
    expect(hydrated.settings.ai.feedbackLanguage).toBe('pl');
    expect(hydrated.dailyMission.date).toBe('2024-01-05');
  });

  it('creates and refreshes daily missions', () => {
    Date.now = () => 1704456000000;
    Math.random = () => 0.42;
    const mission = createDailyMission(new Date('2024-01-05T00:00:00.000Z'));

    expect(mission.date).toBe('2024-01-05');
    expect(mission.id).toContain('2024-01-05');
    expect(mission.id).toContain(mission.type);

    const stale = { ...mission, date: '2024-01-01' };
    const refreshed = ensureDailyMission(stale);
    expect(refreshed.date).toBe('2024-01-05');
  });

  it('applies mission rewards and updates levels', () => {
    const updated = applyMissionReward({ ...defaultStats, totalXp: 0, level: 1 }, 100);
    expect(updated.totalXp).toBe(100);
    expect(updated.level).toBe(2);
  });
});
