import { beforeEach, describe, expect, it } from 'vitest';
import { useVocabStore } from '@/lib/store';

const seedVocabulary = [
  {
    id: 'v1',
    en: 'apple',
    phonetic: '/apple/',
    pl: 'jablko',
    category: 'Test',
    difficulty: 'easy' as const,
    created_at: new Date(),
    source: 'manual' as const,
    setIds: [],
    languagePair: 'pl-en',
  },
  {
    id: 'v2',
    en: 'banana',
    phonetic: '/banana/',
    pl: 'banan',
    category: 'Test',
    difficulty: 'easy' as const,
    created_at: new Date(),
    source: 'manual' as const,
    setIds: [],
    languagePair: 'pl-en',
  },
];

beforeEach(() => {
  useVocabStore.setState({
    vocabulary: seedVocabulary.map((word) => ({ ...word, setIds: [] })),
    sets: [],
    progress: {},
  });
});

describe('vocab sets store', () => {
  it('creates unique set names', () => {
    const { createSet } = useVocabStore.getState();
    const first = createSet('Biologia');
    const second = createSet('Biologia');

    expect(first.name).toBe('Biologia');
    expect(second.name).toBe('Biologia (2)');
  });

  it('renames sets with uniqueness', () => {
    const { createSet, renameSet } = useVocabStore.getState();
    const setA = createSet('Biologia');
    const setB = createSet('Historia');

    renameSet(setB.id, 'Biologia');

    const updated = useVocabStore.getState().sets.find((set) => set.id === setB.id);
    expect(updated?.name).toBe('Biologia (2)');
    expect(useVocabStore.getState().sets.find((set) => set.id === setA.id)?.name).toBe('Biologia');
  });

  it('assigns words to a set and removes links on delete', () => {
    const { createSet, assignWordsToSet, deleteSet } = useVocabStore.getState();
    const set = createSet('Klasowka');

    assignWordsToSet(['v1', 'v2'], set.id);

    const assigned = useVocabStore
      .getState()
      .vocabulary.map((word) => word.setIds ?? []);
    expect(assigned.every((ids) => ids.includes(set.id))).toBe(true);

    deleteSet(set.id);

    const afterDelete = useVocabStore
      .getState()
      .vocabulary.map((word) => word.setIds ?? []);
    expect(afterDelete.every((ids) => !ids.includes(set.id))).toBe(true);
    expect(useVocabStore.getState().sets).toHaveLength(0);
  });

  it('replaces word set assignments', () => {
    const { createSet, assignWordsToSet, replaceWordsSet } = useVocabStore.getState();
    const setA = createSet('Historia');
    const setB = createSet('Geografia');

    assignWordsToSet(['v1', 'v2'], setA.id);
    replaceWordsSet(['v1'], setB.id);
    replaceWordsSet(['v2'], null);

    const [wordA, wordB] = useVocabStore.getState().vocabulary;
    expect(wordA.setIds).toEqual([setB.id]);
    expect(wordB.setIds).toEqual([]);
  });
});
