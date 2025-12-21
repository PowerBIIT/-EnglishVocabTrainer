import { describe, expect, it } from 'vitest';
import { createDailyMission, defaultSettings, defaultStats, hydrateAppState } from '@/lib/appState';
import type { AppState } from '@/lib/appState';

describe('hydrateAppState', () => {
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
});
